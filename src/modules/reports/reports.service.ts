import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Transaction } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import { Wallet } from '../../models/wallet.model';
import { AMLAlert } from '../../models/aml-alert.model';
import { BankStatement } from '../../models/bank-statement.model';
import { GenerateTransactionReportDto } from './dtos/reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Transaction) private transactionModel: typeof Transaction,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Wallet) private walletModel: typeof Wallet,
    @InjectModel(AMLAlert) private amlAlertModel: typeof AMLAlert,
    @InjectModel(BankStatement) private bankStatementModel: typeof BankStatement,
  ) {}

  async generateTransactionReport(dto: GenerateTransactionReportDto) {
    const { start_date, end_date, format = 'json', transaction_type, status } = dto;

    const where: any = {
      created_at: {
        [Op.between]: [new Date(start_date), new Date(end_date)],
      },
    };

    if (transaction_type) where.type = transaction_type;
    if (status) where.status = status;

    const transactions = await this.transactionModel.findAll({
      where,
      include: [
        { model: User, as: 'senderUser', attributes: ['id', 'user_name'] },
        { model: User, as: 'receiverUser', attributes: ['id', 'user_name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const summary = {
      total_transactions: transactions.length,
      total_amount: transactions.reduce((sum, txn) => sum + parseFloat(txn.amount), 0),
      by_type: {},
      by_status: {},
    };

    transactions.forEach((txn) => {
      summary.by_type[txn.type] = (summary.by_type[txn.type] || 0) + 1;
      summary.by_status[txn.status] = (summary.by_status[txn.status] || 0) + 1;
    });

    return {
      report_type: 'transactions',
      period: { start_date, end_date },
      generated_at: new Date(),
      summary,
      transactions: format === 'json' ? transactions : [],
      format,
    };
  }

  async generateUserSummaryReport() {
    const [totalUsers, activeUsers, suspendedUsers, wallets] = await Promise.all([
      this.userModel.count(),
      this.userModel.count({ where: { user_status: 'active' } }),
      this.userModel.count({ where: { user_status: 'suspended' } }),
      this.walletModel.findAll({
        attributes: [
          'currency',
          [this.walletModel.sequelize!.fn('COUNT', '*'), 'count'],
          [this.walletModel.sequelize!.fn('SUM', this.walletModel.sequelize!.col('available_balance')), 'total_balance'],
        ],
        group: ['currency'],
        raw: true,
      }),
    ]);

    const recentRegistrations = await this.userModel.count({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      } as any,
    });

    return {
      report_type: 'users',
      generated_at: new Date(),
      summary: {
        total_users: totalUsers,
        active_users: activeUsers,
        suspended_users: suspendedUsers,
        recent_registrations_30d: recentRegistrations,
      },
      wallets_by_currency: wallets,
    };
  }

  async generateAMLSummaryReport() {
    const [
      totalAlerts,
      pendingAlerts,
      resolvedAlerts,
      falsePositives,
      escalated,
      alertsBySeverity,
      alertsByType,
      recentAlerts,
    ] = await Promise.all([
      this.amlAlertModel.count(),
      this.amlAlertModel.count({ where: { status: 'pending' } }),
      this.amlAlertModel.count({ where: { status: 'resolved' } }),
      this.amlAlertModel.count({ where: { status: 'false_positive' } }),
      this.amlAlertModel.count({ where: { status: 'escalated' } }),
      this.amlAlertModel.findAll({
        attributes: [
          'severity',
          [this.amlAlertModel.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: ['severity'],
        raw: true,
      }),
      this.amlAlertModel.findAll({
        attributes: [
          'alert_type',
          [this.amlAlertModel.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: ['alert_type'],
        raw: true,
      }),
      this.amlAlertModel.count({
        where: {
          created_at: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      report_type: 'aml_summary',
      generated_at: new Date(),
      summary: {
        total_alerts: totalAlerts,
        pending: pendingAlerts,
        resolved: resolvedAlerts,
        false_positives: falsePositives,
        escalated: escalated,
        recent_alerts_30d: recentAlerts,
      },
      by_severity: alertsBySeverity,
      by_type: alertsByType,
    };
  }

  async generateReconciliationReport() {
    const statements = await this.bankStatementModel.findAll({
      attributes: [
        'file_format',
        [this.bankStatementModel.sequelize!.fn('COUNT', '*'), 'count'],
      ],
      group: ['file_format'],
      raw: true,
    });

    const recentStatements = await this.bankStatementModel.findAll({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      order: [['created_at', 'DESC']],
      limit: 10,
    });

    return {
      report_type: 'reconciliation',
      generated_at: new Date(),
      summary: {
        total_statements: statements.reduce((sum: number, s: any) => sum + parseInt(s.count), 0),
        by_format: statements,
      },
      recent_statements: recentStatements,
    };
  }
}

