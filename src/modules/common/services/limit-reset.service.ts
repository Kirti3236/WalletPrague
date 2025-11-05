import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LimitCountersService } from './limit-counters.service';

/**
 * Service to handle scheduled reset of daily and monthly limit counters
 * Uses NestJS @Cron decorators for automated scheduling
 */
@Injectable()
export class LimitResetService {
  constructor(private readonly limitCountersService: LimitCountersService) {}

  /**
   * Reset daily counters every day at midnight UTC
   * Runs at: 00:00:00 UTC every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'UTC',
  })
  async handleDailyReset(): Promise<void> {
    console.log('[LimitReset] Starting daily counter reset...');
    await this.limitCountersService.resetDailyCounters();
  }

  /**
   * Reset monthly counters on the first day of month at midnight UTC
   * Runs at: 00:00:00 UTC on 1st day of every month
   */
  @Cron('0 0 1 * *', {
    timeZone: 'UTC',
  })
  async handleMonthlyReset(): Promise<void> {
    console.log('[LimitReset] Starting monthly counter reset...');
    await this.limitCountersService.resetMonthlyCounters();
  }

  /**
   * Clean up old daily counters (older than 90 days) every week
   * Runs at: 02:00:00 UTC on Sunday (once per week)
   */
  @Cron('0 2 * * 0', {
    timeZone: 'UTC',
  })
  async handleWeeklyCleanup(): Promise<void> {
    console.log('[LimitReset] Starting weekly cleanup of old counters...');
    await this.limitCountersService.cleanupOldDailyCounters();
  }
}
