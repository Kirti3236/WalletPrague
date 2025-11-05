import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { Op } from 'sequelize';
import { User } from '../../models/user.model';
import { Transaction } from '../../models/transaction.model';
import { UserLimit } from '../../models/user-limit.model';
import { LimitCounterDaily } from '../../models/limit-counter-daily.model';
import { LimitCounterMonthly } from '../../models/limit-counter-monthly.model';
import { LimitPolicy } from '../../models/limit-policy.model';
import { Restriction } from '../../models/restriction.model';
import { AMLAlert } from '../../models/aml-alert.model';
import { EvaluateRiskDto, GetLimitCountersDto } from './dtos/risk.dto';

interface RiskFactor {
  type: string;
  description: string;
  severity: string;
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(
    private readonly i18n: I18nService,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Transaction) private transactionModel: typeof Transaction,
    @InjectModel(UserLimit) private userLimitModel: typeof UserLimit,
    @InjectModel(LimitCounterDaily) private dailyCounterModel: typeof LimitCounterDaily,
    @InjectModel(LimitCounterMonthly) private monthlyCounterModel: typeof LimitCounterMonthly,
    @InjectModel(Restriction) private restrictionModel: typeof Restriction,
    @InjectModel(AMLAlert) private amlAlertModel: typeof AMLAlert,
  ) {}

  async evaluateTransactionRisk(dto: EvaluateRiskDto) {
    const { user_id, amount, transaction_type, recipient_id, currency = 'HNL' } = dto;

    // Get user details
    const user = await this.userModel.findByPk(user_id);
    if (!user) {
      throw new NotFoundException(
        this.getTranslatedMessage('risk.assessment_not_found'),
      );
    }

    const riskFactors: RiskFactor[] = [];
    let riskScore = 0;
    let riskLevel = 'LOW';

    // Check user limits
    const userLimit = await this.userLimitModel.findOne({
      where: { user_id },
      include: [{ model: LimitPolicy }],
    });

    if (userLimit) {
      const policy = userLimit.policy;

      // Check single transaction limit
      if (amount > policy.max_transaction_amount) {
        riskFactors.push({
          type: 'LIMIT_EXCEEDED',
          description: 'Transaction exceeds single transaction limit',
          severity: 'HIGH',
        });
        riskScore += 30;
      }

      // Check daily counters
      const today = new Date().toISOString().split('T')[0];
      const dailyCounter = await this.dailyCounterModel.findOne({
        where: { user_id, counter_date: today },
      });

      if (dailyCounter) {
        const projectedDailyAmount = parseFloat(dailyCounter.total_amount.toString()) + amount;
        const projectedDailyCount = dailyCounter.transaction_count + 1;

        if (projectedDailyAmount > policy.max_daily_amount) {
          riskFactors.push({
            type: 'DAILY_LIMIT',
            description: 'Would exceed daily amount limit',
            severity: 'MEDIUM',
          });
          riskScore += 20;
        }

        if (projectedDailyCount > policy.max_daily_count) {
          riskFactors.push({
            type: 'DAILY_FREQUENCY',
            description: 'Would exceed daily transaction count',
            severity: 'MEDIUM',
          });
          riskScore += 15;
        }
      }
    }

    // Check for velocity (rapid transactions)
    const recentTransactions = await this.transactionModel.count({
      where: {
        [Op.or]: [{ sender_user_id: user_id }, { receiver_user_id: user_id }],
        created_at: {
          [Op.gte]: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
        },
      } as any,
    });

    if (recentTransactions > 5) {
      riskFactors.push({
        type: 'VELOCITY',
        description: `${recentTransactions} transactions in last 15 minutes`,
        severity: 'HIGH',
      });
      riskScore += 25;
    }

    // Check for large amount relative to history
    const avgTransactionAmount = await this.transactionModel.findOne({
      attributes: [
        [this.transactionModel.sequelize!.fn('AVG', this.transactionModel.sequelize!.col('amount')), 'avg_amount'],
      ],
      where: {
        sender_user_id: user_id,
        created_at: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      } as any,
      raw: true,
    }) as any;

    if (avgTransactionAmount?.avg_amount) {
      const avgAmount = parseFloat(avgTransactionAmount.avg_amount);
      if (amount > avgAmount * 5) {
        riskFactors.push({
          type: 'UNUSUAL_AMOUNT',
          description: 'Transaction amount significantly higher than user average',
          severity: 'MEDIUM',
        });
        riskScore += 20;
      }
    }

    // Check for active restrictions
    const activeRestrictions = await this.restrictionModel.count({
      where: {
        user_id,
        is_active: true,
      },
    });

    if (activeRestrictions > 0) {
      riskFactors.push({
        type: 'RESTRICTIONS',
        description: `User has ${activeRestrictions} active restrictions`,
        severity: 'HIGH',
      });
      riskScore += 40;
    }

    // Check for pending AML alerts
    const pendingAlerts = await this.amlAlertModel.count({
      where: {
        user_id,
        status: 'pending',
      },
    });

    if (pendingAlerts > 0) {
      riskFactors.push({
        type: 'PENDING_ALERTS',
        description: `User has ${pendingAlerts} pending AML alerts`,
        severity: 'CRITICAL',
      });
      riskScore += 50;
    }

    // Determine risk level
    if (riskScore >= 70) {
      riskLevel = 'CRITICAL';
    } else if (riskScore >= 50) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 30) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    const recommendation =
      riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
        ? 'DENY'
        : riskLevel === 'MEDIUM'
          ? 'REVIEW'
          : 'APPROVE';

    return {
      user_id,
      amount,
      currency,
      transaction_type,
      risk_score: riskScore,
      risk_level: riskLevel,
      recommendation,
      risk_factors: riskFactors,
      evaluation_timestamp: new Date(),
    };
  }

  async getLimitCounters(dto: GetLimitCountersDto) {
    const { user_id, period = 'both' } = dto;

    const user = await this.userModel.findByPk(user_id);
    if (!user) {
      throw new NotFoundException(
        this.getTranslatedMessage('risk.assessment_not_found'),
      );
    }

    const result: any = { user_id };

    if (period === 'daily' || period === 'both') {
      const today = new Date().toISOString().split('T')[0];
      const dailyCounter = await this.dailyCounterModel.findOne({
        where: { user_id, counter_date: today },
      });

      result.daily = dailyCounter || {
        total_amount: 0,
        transaction_count: 0,
        counter_date: today,
      };
    }

    if (period === 'monthly' || period === 'both') {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const monthlyCounter = await this.monthlyCounterModel.findOne({
        where: { user_id, counter_year: year, counter_month: month },
      });

      result.monthly = monthlyCounter || {
        total_amount: 0,
        transaction_count: 0,
        counter_year: year,
        counter_month: month,
      };
    }

    // Include user's limits
    const userLimit = await this.userLimitModel.findOne({
      where: { user_id },
      include: [{ model: LimitPolicy }],
    });

    result.limits = userLimit
      ? {
          policy: userLimit.policy.policy_name,
          max_transaction_amount: userLimit.policy.max_transaction_amount,
          max_daily_amount: userLimit.policy.max_daily_amount,
          max_daily_count: userLimit.policy.max_daily_count,
          max_monthly_amount: userLimit.policy.max_monthly_amount,
          max_monthly_count: userLimit.policy.max_monthly_count,
        }
      : null;

    return result;
  }

  async getRestrictions() {
    const restrictions = await this.restrictionModel.findAll({
      where: { is_active: true },
      include: [{ model: User, attributes: ['id', 'user_name', 'user_email'] }],
      order: [['created_at', 'DESC']],
    });

    return {
      total: restrictions.length,
      restrictions,
    };
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
