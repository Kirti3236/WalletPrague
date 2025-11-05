import { Injectable, Inject } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { IdempotencyKey } from '../../models/idempotency-key.model';

interface IdempotencyCheckResult {
  exists: boolean;
  cachedResponse?: {
    statusCode: number;
    payload: Record<string, any>;
  };
}

@Injectable()
export class IdempotencyKeyService {
  constructor(
    @Inject(getModelToken(IdempotencyKey))
    private readonly idempotencyKeyModel: typeof IdempotencyKey,
  ) {}

  /**
   * Check if idempotency key exists and return cached response if it does
   * @param userId User ID
   * @param idempotencyKey Idempotency key from request header
   * @returns {IdempotencyCheckResult} Result with exists flag and cached response
   */
  async checkIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<IdempotencyCheckResult> {
    try {
      const record = await this.idempotencyKeyModel.findOne({
        where: {
          user_id: userId,
          idempotency_key: idempotencyKey,
        },
      });

      if (!record) {
        return { exists: false };
      }

      // Check if key has expired
      if (new Date() > record.expires_at) {
        // Delete expired key
        await record.destroy();
        return { exists: false };
      }

      // Return cached response
      return {
        exists: true,
        cachedResponse: {
          statusCode: record.http_status_code,
          payload: record.response_payload,
        },
      };
    } catch (error) {
      console.error('Error checking idempotency key:', error);
      // On error, allow request to proceed (fail open)
      return { exists: false };
    }
  }

  /**
   * Store idempotency key with response
   * @param userId User ID
   * @param idempotencyKey Idempotency key from request header
   * @param responsePayload Response data to cache
   * @param httpStatusCode HTTP status code of the response
   */
  async storeIdempotencyKey(
    userId: string,
    idempotencyKey: string,
    responsePayload: Record<string, any>,
    httpStatusCode: number,
  ): Promise<void> {
    try {
      // Calculate expiration (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await this.idempotencyKeyModel.create({
        user_id: userId,
        idempotency_key: idempotencyKey,
        response_payload: responsePayload,
        http_status_code: httpStatusCode,
        expires_at: expiresAt,
      });
    } catch (error) {
      // If duplicate key exists (race condition), that's fine
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log(
          `Idempotency key already exists for user ${userId}: ${idempotencyKey}`,
        );
        // Fetch and return the existing cached response
        const record = await this.idempotencyKeyModel.findOne({
          where: {
            user_id: userId,
            idempotency_key: idempotencyKey,
          },
        });
        if (record) {
          return; // Key was already stored by concurrent request
        }
      }
      console.error('Error storing idempotency key:', error);
    }
  }

  /**
   * Clean up expired idempotency keys (run as background job)
   * Should be called by a scheduled task every hour
   */
  async cleanupExpiredKeys(): Promise<void> {
    try {
      const result = await this.idempotencyKeyModel.destroy({
        where: {
          expires_at: {
            [require('sequelize').Op.lt]: new Date(),
          },
        },
      });
      console.log(`Cleaned up ${result} expired idempotency keys`);
    } catch (error) {
      console.error('Error cleaning up expired idempotency keys:', error);
    }
  }

  /**
   * Delete specific idempotency key (admin only)
   * @param keyId Idempotency key ID
   */
  async deleteIdempotencyKey(keyId: string): Promise<boolean> {
    try {
      const result = await this.idempotencyKeyModel.destroy({
        where: { id: keyId },
      });
      return result > 0;
    } catch (error) {
      console.error('Error deleting idempotency key:', error);
      return false;
    }
  }

  /**
   * Get idempotency key details (admin only)
   * @param keyId Idempotency key ID
   */
  async getIdempotencyKey(keyId: string): Promise<IdempotencyKey | null> {
    try {
      return await this.idempotencyKeyModel.findByPk(keyId);
    } catch (error) {
      console.error('Error fetching idempotency key:', error);
      return null;
    }
  }
}
