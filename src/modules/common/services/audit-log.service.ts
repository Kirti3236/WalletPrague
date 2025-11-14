import { Injectable, Inject } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import * as crypto from 'crypto';
import { Op } from 'sequelize';
import { AuditLog, AuditAction } from '../../../models/audit-log.model';
import { User } from '../../../models/user.model';

interface AuditLogDto {
  user_id?: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  status?: string;
  error_message?: string;
  response_time_ms?: number;
  amount?: number;
  currency?: string;
  is_compliance_relevant?: boolean;
}

@Injectable()
export class AuditLogService {
  constructor(
    @Inject(getModelToken(AuditLog))
    private readonly auditLogModel: typeof AuditLog,
  ) {}

  /**
   * Log an action with hash-chaining
   */
  async logAction(auditDto: AuditLogDto): Promise<AuditLog> {
    // Get previous log entry for hash-chaining
    const previousLog = await this.auditLogModel.findOne({
      order: [['sequence_number', 'DESC']],
      limit: 1,
    });

    const previousHash = previousLog ? previousLog.entry_hash : null;

    // Create hash of this entry
    const entryHash = this.generateEntryHash(
      auditDto,
      previousHash,
      previousLog ? previousLog.sequence_number + 1 : 1,
    );

    // Verify chain integrity
    const hashChainValid = previousLog && previousHash
      ? this.verifyHashChain(previousLog, previousHash)
      : true;

    // Create audit log entry
    const auditLog = await this.auditLogModel.create({
      user_id: auditDto.user_id,
      action: auditDto.action,
      resource_type: auditDto.resource_type,
      resource_id: auditDto.resource_id,
      before_state: auditDto.before_state,
      after_state: auditDto.after_state,
      reason: auditDto.reason,
      ip_address: auditDto.ip_address,
      user_agent: auditDto.user_agent,
      entry_hash: entryHash,
      previous_hash: previousHash,
      hash_chain_valid: hashChainValid,
      status: auditDto.status || 'success',
      error_message: auditDto.error_message,
      response_time_ms: auditDto.response_time_ms,
      amount: auditDto.amount,
      currency: auditDto.currency,
      is_compliance_relevant: auditDto.is_compliance_relevant || false,
    });

    return auditLog;
  }

  /**
   * Verify hash chain integrity
   */
  async verifyHashChainIntegrity(startId?: string): Promise<{
    valid: boolean;
    errors: string[];
    checked_entries: number;
  }> {
    const errors: string[] = [];
    let checkedEntries = 0;

    const query = startId ? { id: { [Op.gte]: startId } } : {};
    const logs = await this.auditLogModel.findAll({
      where: query,
      order: [['sequence_number', 'ASC']],
    });

    for (let i = 0; i < logs.length; i++) {
      checkedEntries++;
      const currentLog = logs[i];
      const previousLog = i > 0 ? logs[i - 1] : null;

      // Verify hash chain link
      if (previousLog) {
        if (currentLog.previous_hash !== previousLog.entry_hash) {
          errors.push(
            `Chain broken at entry ${currentLog.sequence_number}: previous_hash mismatch`,
          );
        }
      } else {
        if (currentLog.previous_hash !== null) {
          errors.push(
            `First entry ${currentLog.sequence_number} should have null previous_hash`,
          );
        }
      }

      // Verify entry hash
      const calculatedHash = this.generateEntryHash(
        {
          user_id: currentLog.user_id,
          action: currentLog.action,
          resource_type: currentLog.resource_type,
          resource_id: currentLog.resource_id,
          before_state: currentLog.before_state,
          after_state: currentLog.after_state,
          reason: currentLog.reason,
          ip_address: currentLog.ip_address,
          user_agent: currentLog.user_agent,
          status: currentLog.status,
          error_message: currentLog.error_message,
          response_time_ms: currentLog.response_time_ms,
          amount: currentLog.amount,
          currency: currentLog.currency,
          is_compliance_relevant: currentLog.is_compliance_relevant,
        },
        currentLog.previous_hash,
        currentLog.sequence_number,
      );

      if (calculatedHash !== currentLog.entry_hash) {
        errors.push(
          `Hash mismatch at entry ${currentLog.sequence_number}: entry has been tampered with`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      checked_entries: checkedEntries,
    };
  }

  /**
   * Get audit logs for a specific user (or all users if userId is 'all')
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const whereClause = userId === 'all' || !userId ? {} : { user_id: userId };
    
    const { rows, count } = await this.auditLogModel.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'user_first_name', 'user_last_name', 'user_email'],
          required: false,
        },
      ],
    });

    return { logs: rows, total: count };
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceAuditLogs(
    resourceType: string,
    resourceId: string,
  ): Promise<AuditLog[]> {
    return await this.auditLogModel.findAll({
      where: {
        resource_type: resourceType,
        resource_id: resourceId,
      },
      order: [['created_at', 'ASC']],
    });
  }

  /**
   * Get compliance-relevant audit logs
   */
  async getComplianceAuditLogs(
    startDate: Date,
    endDate: Date,
  ): Promise<AuditLog[]> {
    return await this.auditLogModel.findAll({
      where: {
        is_compliance_relevant: true,
        created_at: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Get audit logs by action
   */
  async getAuditLogsByAction(
    action: AuditAction,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditLog[]> {
    const where: any = { action };

    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [startDate, endDate],
      };
    }

    return await this.auditLogModel.findAll({
      where,
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Get audit logs for a period
   */
  async getAuditLogsPeriod(
    startDate: Date,
    endDate: Date,
    limit?: number,
  ): Promise<AuditLog[]> {
    const query: any = {
      created_at: {
        [Op.between]: [startDate, endDate],
      },
    };

    const findOptions: any = {
      where: query,
      order: [['created_at', 'DESC']],
    };

    if (limit) {
      findOptions.limit = limit;
    }

    return await this.auditLogModel.findAll(findOptions);
  }

  /**
   * Get audit logs with failed status
   */
  async getFailedAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return await this.auditLogModel.findAll({
      where: {
        status: {
          [Op.in]: ['failure', 'error', 'partial'],
        },
      },
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  /**
   * Get latest audit log entry
   */
  async getLatestAuditLog(): Promise<AuditLog | null> {
    return await this.auditLogModel.findOne({
      order: [['sequence_number', 'DESC']],
      limit: 1,
    });
  }

  /**
   * Export audit logs for compliance
   */
  async exportComplianceLogs(
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const logs = await this.getComplianceAuditLogs(startDate, endDate);

    return logs.map((log) => ({
      timestamp: log.created_at,
      sequence: log.sequence_number,
      user: log.user_id,
      action: log.action,
      resource: `${log.resource_type}/${log.resource_id}`,
      status: log.status,
      amount: log.amount ? `${log.amount} ${log.currency}` : null,
      reason: log.reason,
      ip_address: log.ip_address,
      hash: log.entry_hash,
      previous_hash: log.previous_hash,
      chain_valid: log.hash_chain_valid,
    }));
  }

  /**
   * Helper: Generate hash for audit entry
   * Hash = SHA-256(sequence_number + user_id + action + resource + previous_hash + timestamp)
   */
  private generateEntryHash(
    auditDto: AuditLogDto,
    previousHash: string | null,
    sequenceNumber: number,
  ): string {
    const content = JSON.stringify({
      sequence_number: sequenceNumber,
      user_id: auditDto.user_id,
      action: auditDto.action,
      resource_type: auditDto.resource_type,
      resource_id: auditDto.resource_id,
      before_state: auditDto.before_state,
      after_state: auditDto.after_state,
      reason: auditDto.reason,
      ip_address: auditDto.ip_address,
      user_agent: auditDto.user_agent,
      status: auditDto.status,
      error_message: auditDto.error_message,
      response_time_ms: auditDto.response_time_ms,
      amount: auditDto.amount,
      currency: auditDto.currency,
      is_compliance_relevant: auditDto.is_compliance_relevant,
      previous_hash: previousHash,
    });

    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  /**
   * Helper: Verify hash chain
   */
  private verifyHashChain(previousLog: AuditLog, previousHash: string): boolean {
    if (!previousLog) {
      return previousHash === null;
    }

    return previousLog.entry_hash === previousHash && previousLog.hash_chain_valid;
  }
}
