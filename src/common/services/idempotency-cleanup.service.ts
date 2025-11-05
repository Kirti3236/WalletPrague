import { Injectable, Inject } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { getModelToken } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { IdempotencyKey } from '../../models/idempotency-key.model';

/**
 * Service to handle scheduled cleanup of expired idempotency keys
 * Runs every hour to clean up keys older than 24 hours
 */
@Injectable()
export class IdempotencyCleanupService {
  constructor(
    @Inject(getModelToken(IdempotencyKey))
    private readonly idempotencyKeyModel: typeof IdempotencyKey,
  ) {}

  /**
   * Run cleanup of expired idempotency keys
   * Scheduled to run every hour
   */
  @Interval(3600000) // 1 hour in milliseconds
  async cleanupExpiredKeys(): Promise<void> {
    try {
      const now = new Date();
      const result = await this.idempotencyKeyModel.destroy({
        where: {
          expires_at: {
            [Op.lt]: now,
          },
        },
      });

      if (result > 0) {
        console.log(
          `[IdempotencyCleanup] Removed ${result} expired idempotency keys at ${now.toISOString()}`,
        );
      }
    } catch (error) {
      console.error(
        '[IdempotencyCleanup] Error cleaning up expired keys:',
        error,
      );
    }
  }

  /**
   * Manual cleanup trigger (for testing or on-demand)
   * @returns Number of keys deleted
   */
  async triggerCleanup(): Promise<number> {
    try {
      const now = new Date();
      const result = await this.idempotencyKeyModel.destroy({
        where: {
          expires_at: {
            [Op.lt]: now,
          },
        },
      });

      console.log(
        `[IdempotencyCleanup] Manually removed ${result} expired idempotency keys`,
      );
      return result;
    } catch (error) {
      console.error('[IdempotencyCleanup] Error during manual cleanup:', error);
      return 0;
    }
  }
}
