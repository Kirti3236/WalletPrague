import { Injectable, Inject } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { LimitCounterDaily } from '../../../models/limit-counter-daily.model';
import { LimitCounterMonthly } from '../../../models/limit-counter-monthly.model';

interface CounterState {
  daily_amount_used: number;
  daily_count_used: number;
  monthly_amount_used: number;
  monthly_count_used: number;
}

@Injectable()
export class LimitCountersService {
  constructor(
    @Inject(getModelToken(LimitCounterDaily))
    private readonly dailyCounterModel: typeof LimitCounterDaily,
    @Inject(getModelToken(LimitCounterMonthly))
    private readonly monthlyCounterModel: typeof LimitCounterMonthly,
  ) {}

  /**
   * Get current counter state for a user
   */
  async getCounterState(userId: string): Promise<CounterState> {
    const today = new Date();
    const todayStr = this.formatDate(today);
    const currentMonth = this.formatMonth(today);

    // Get daily counter
    const dailyCounter = await this.dailyCounterModel.findOne({
      where: {
        user_id: userId,
        counter_date: {
          [Op.gte]: new Date(todayStr),
          [Op.lt]: new Date(new Date(todayStr).getTime() + 86400000),
        },
      },
    });

    // Get monthly counter
    const monthlyCounter = await this.monthlyCounterModel.findOne({
      where: {
        user_id: userId,
        month_year: currentMonth,
      },
    });

    return {
      daily_amount_used: dailyCounter?.total_amount ?? 0,
      daily_count_used: dailyCounter?.transaction_count ?? 0,
      monthly_amount_used: monthlyCounter?.total_amount ?? 0,
      monthly_count_used: monthlyCounter?.transaction_count ?? 0,
    };
  }

  /**
   * Increment counters after a transaction
   */
  async incrementCounters(
    userId: string,
    amount: number,
  ): Promise<void> {
    const today = new Date();
    const todayStr = this.formatDate(today);
    const currentMonth = this.formatMonth(today);

    // Increment daily counter
    const resetAtDaily = new Date(today);
    resetAtDaily.setUTCHours(24, 0, 0, 0);

    await this.dailyCounterModel.increment(
      {
        total_amount: amount,
        transaction_count: 1,
      },
      {
        where: {
          user_id: userId,
          counter_date: {
            [Op.gte]: new Date(todayStr),
            [Op.lt]: new Date(new Date(todayStr).getTime() + 86400000),
          },
        },
      },
    );

    // Create daily counter if it doesn't exist
    await this.dailyCounterModel.findOrCreate({
      where: {
        user_id: userId,
        counter_date: new Date(todayStr),
      },
      defaults: {
        user_id: userId,
        counter_date: new Date(todayStr),
        total_amount: amount,
        transaction_count: 1,
        is_locked: false,
        reset_at: resetAtDaily,
      },
    });

    // Increment monthly counter
    const nextMonth = new Date(today);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
    nextMonth.setUTCHours(0, 0, 0, 0);

    await this.monthlyCounterModel.increment(
      {
        total_amount: amount,
        transaction_count: 1,
      },
      {
        where: {
          user_id: userId,
          month_year: currentMonth,
        },
      },
    );

    // Create monthly counter if it doesn't exist
    await this.monthlyCounterModel.findOrCreate({
      where: {
        user_id: userId,
        month_year: currentMonth,
      },
      defaults: {
        user_id: userId,
        month_year: currentMonth,
        total_amount: amount,
        transaction_count: 1,
        is_locked: false,
        reset_at: nextMonth,
      },
    });
  }

  /**
   * Reset daily counters (runs at midnight UTC)
   */
  async resetDailyCounters(): Promise<void> {
    try {
      const now = new Date();

      // Lock all counters from previous day
      await this.dailyCounterModel.update(
        { is_locked: true },
        {
          where: {
            reset_at: {
              [Op.lte]: now,
            },
            is_locked: false,
          },
        },
      );

      console.log(
        `[LimitCounters] Daily counters reset at ${now.toISOString()}`,
      );
    } catch (error) {
      console.error('[LimitCounters] Error resetting daily counters:', error);
    }
  }

  /**
   * Reset monthly counters (runs on first day of month)
   */
  async resetMonthlyCounters(): Promise<void> {
    try {
      const now = new Date();

      // Lock all counters from previous month
      await this.monthlyCounterModel.update(
        { is_locked: true },
        {
          where: {
            reset_at: {
              [Op.lte]: now,
            },
            is_locked: false,
          },
        },
      );

      console.log(
        `[LimitCounters] Monthly counters reset at ${now.toISOString()}`,
      );
    } catch (error) {
      console.error('[LimitCounters] Error resetting monthly counters:', error);
    }
  }

  /**
   * Clean up old daily counters (older than 90 days)
   */
  async cleanupOldDailyCounters(): Promise<void> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);

      const result = await this.dailyCounterModel.destroy({
        where: {
          counter_date: {
            [Op.lt]: ninetyDaysAgo,
          },
        },
      });

      if (result > 0) {
        console.log(
          `[LimitCounters] Deleted ${result} old daily counters`,
        );
      }
    } catch (error) {
      console.error('[LimitCounters] Error cleaning up daily counters:', error);
    }
  }

  /**
   * Helper: Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Helper: Format month as YYYY-MM
   */
  private formatMonth(date: Date): string {
    return date.toISOString().split('T')[0].substring(0, 7);
  }
}
