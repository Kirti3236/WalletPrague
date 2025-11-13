import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { UserLimit } from '../../../models/user-limit.model';
import { LimitPolicy } from '../../../models/limit-policy.model';
import { LimitPoliciesService } from './limit-policies.service';
import { LimitCountersService } from './limit-counters.service';

interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  exceeded_limit?: number;
  exceeded_limit_type?: 'transaction' | 'daily_amount' | 'daily_count' | 'monthly_amount' | 'monthly_count';
  remaining_daily_amount?: number;
  remaining_daily_count?: number;
  remaining_monthly_amount?: number;
  remaining_monthly_count?: number;
}

@Injectable()
export class LimitValidationService {
  private readonly logger = new Logger(LimitValidationService.name);

  constructor(
    private readonly i18n: I18nService,
    @Inject(getModelToken(UserLimit))
    private readonly userLimitModel: typeof UserLimit,
    private readonly limitPoliciesService: LimitPoliciesService,
    private readonly limitCountersService: LimitCountersService,
  ) {}

  /**
   * Check if a transaction is allowed for a user
   */
  async validateTransaction(
    userId: string,
    amount: number,
  ): Promise<LimitCheckResult> {
    try {
      // Get user's limit policy
      const userLimit = await this.userLimitModel.findOne({
        where: { user_id: userId },
        include: [{ model: LimitPolicy }],
      });
       
      if (!userLimit) {
        return {
          allowed: false,
          reason: 'User has no limit policy assigned',
        };
      }
      
      const policy = userLimit.policy;
      if (!policy) {
        return {
          allowed: false,
          reason: 'User limit policy not found or not properly loaded',
        };
      }
      
      if (!policy.is_active) {
        return {
          allowed: false,
          reason: 'User limit policy is inactive',
        };
      }

      // Check transaction amount limit
      if (amount > policy.max_transaction_amount) {
        return {
          allowed: false,
          reason: `Transaction amount (${amount}) exceeds maximum (${policy.max_transaction_amount})`,
          exceeded_limit: policy.max_transaction_amount,
          exceeded_limit_type: 'transaction',
          remaining_daily_amount: policy.max_daily_amount,
          remaining_daily_count: policy.max_daily_count,
          remaining_monthly_amount: policy.max_monthly_amount,
          remaining_monthly_count: policy.max_monthly_count,
        };
      }

      // Get current counter state
      const counters = await this.limitCountersService.getCounterState(userId);

      // Check daily amount limit
      const newDailyAmount = counters.daily_amount_used + amount;
      if (newDailyAmount > policy.max_daily_amount) {
        return {
          allowed: false,
          reason: `Daily amount limit exceeded. Current: ${counters.daily_amount_used}, Limit: ${policy.max_daily_amount}`,
          exceeded_limit: policy.max_daily_amount,
          exceeded_limit_type: 'daily_amount',
          remaining_daily_amount: Math.max(0, policy.max_daily_amount - counters.daily_amount_used),
          remaining_daily_count: Math.max(0, policy.max_daily_count - counters.daily_count_used),
          remaining_monthly_amount: Math.max(0, policy.max_monthly_amount - counters.monthly_amount_used),
          remaining_monthly_count: Math.max(0, policy.max_monthly_count - counters.monthly_count_used),
        };
      }

      // Check daily count limit
      if (counters.daily_count_used >= policy.max_daily_count) {
        return {
          allowed: false,
          reason: `Daily transaction count limit exceeded (${policy.max_daily_count})`,
          exceeded_limit: policy.max_daily_count,
          exceeded_limit_type: 'daily_count',
          remaining_daily_amount: Math.max(0, policy.max_daily_amount - counters.daily_amount_used),
          remaining_daily_count: 0,
          remaining_monthly_amount: Math.max(0, policy.max_monthly_amount - counters.monthly_amount_used),
          remaining_monthly_count: Math.max(0, policy.max_monthly_count - counters.monthly_count_used),
        };
      }

      // Check monthly amount limit
      const newMonthlyAmount = counters.monthly_amount_used + amount;
      if (newMonthlyAmount > policy.max_monthly_amount) {
        return {
          allowed: false,
          reason: `Monthly amount limit exceeded. Current: ${counters.monthly_amount_used}, Limit: ${policy.max_monthly_amount}`,
          exceeded_limit: policy.max_monthly_amount,
          exceeded_limit_type: 'monthly_amount',
          remaining_daily_amount: Math.max(0, policy.max_daily_amount - counters.daily_amount_used),
          remaining_daily_count: Math.max(0, policy.max_daily_count - counters.daily_count_used),
          remaining_monthly_amount: Math.max(0, policy.max_monthly_amount - counters.monthly_amount_used),
          remaining_monthly_count: Math.max(0, policy.max_monthly_count - counters.monthly_count_used),
        };
      }

      // Check monthly count limit
      if (counters.monthly_count_used >= policy.max_monthly_count) {
        return {
          allowed: false,
          reason: `Monthly transaction count limit exceeded (${policy.max_monthly_count})`,
          exceeded_limit: policy.max_monthly_count,
          exceeded_limit_type: 'monthly_count',
          remaining_daily_amount: Math.max(0, policy.max_daily_amount - counters.daily_amount_used),
          remaining_daily_count: Math.max(0, policy.max_daily_count - counters.daily_count_used),
          remaining_monthly_amount: Math.max(0, policy.max_monthly_amount - counters.monthly_amount_used),
          remaining_monthly_count: 0,
        };
      }

      // All checks passed
      return {
        allowed: true,
        remaining_daily_amount: Math.max(0, policy.max_daily_amount - newDailyAmount),
        remaining_daily_count: Math.max(0, policy.max_daily_count - (counters.daily_count_used + 1)),
        remaining_monthly_amount: Math.max(0, policy.max_monthly_amount - newMonthlyAmount),
        remaining_monthly_count: Math.max(0, policy.max_monthly_count - (counters.monthly_count_used + 1)),
      };
    } catch (error) {
      console.error('[LimitValidation] Error validating transaction:', error);
      // Fail open - allow transaction if validation fails
      return {
        allowed: true,
        reason: 'Validation skipped due to error',
      };
    }
  }

  /**
   * Get user's current limit status
   */
  async getUserLimitStatus(userId: string) {
    const userLimit = await this.userLimitModel.findOne({
      where: { user_id: userId },
      include: [{ model: LimitPolicy }],
    });

    if (!userLimit) {
      return {
        has_policy: false,
        message: 'User has no limit policy assigned',
      };
    }

    const policy = userLimit.policy;
    if (!policy) {
      return {
        has_policy: false,
        message: 'User limit policy not found or not properly loaded',
      };
    }

    const counters = await this.limitCountersService.getCounterState(userId);

    return {
      has_policy: true,
      policy: {
        policy_code: policy.policy_code,
        policy_name: policy.policy_name,
        max_transaction_amount: policy.max_transaction_amount,
        max_daily_amount: policy.max_daily_amount,
        max_monthly_amount: policy.max_monthly_amount,
        max_daily_count: policy.max_daily_count,
        max_monthly_count: policy.max_monthly_count,
      },
      current_usage: {
        daily_amount_used: counters.daily_amount_used,
        daily_count_used: counters.daily_count_used,
        monthly_amount_used: counters.monthly_amount_used,
        monthly_count_used: counters.monthly_count_used,
      },
      remaining: {
        daily_amount: Math.max(0, policy.max_daily_amount - counters.daily_amount_used),
        daily_count: Math.max(0, policy.max_daily_count - counters.daily_count_used),
        monthly_amount: Math.max(0, policy.max_monthly_amount - counters.monthly_amount_used),
        monthly_count: Math.max(0, policy.max_monthly_count - counters.monthly_count_used),
      },
    };
  }

  /**
   * Assign a policy to a user
   */
  async assignPolicyToUser(
    userId: string,
    policyCode: string,
    assignedBy: string,
  ): Promise<UserLimit> {
    // Check if user already has a policy
    let userLimit = await this.userLimitModel.findOne({
      where: { user_id: userId },
    });

    // Get the policy
    const policy = await this.limitPoliciesService.getPolicyByCode(policyCode);
    if (!policy) {
      throw new BadRequestException(
        this.getTranslatedMessage('limits.limit_not_found'),
      );
    }

    if (userLimit) {
      // Update existing policy
      userLimit.policy_id = policy.id;
      await userLimit.save();
      return userLimit;
    }

    // Create new user limit
    userLimit = await this.userLimitModel.create({
      user_id: userId,
      policy_id: policy.id,
      created_by: assignedBy,
    });

    return userLimit;
  }

  private getTranslatedMessage(
    key: string,
    lang: string = 'en',
    params?: any,
  ): string {
    try {
      return this.i18n.t(`messages.${key}`, { lang, args: params });
    } catch (error) {
      this.logger.warn(`Translation not found for key: ${key}, lang: ${lang}`);
      return key;
    }
  }
}
