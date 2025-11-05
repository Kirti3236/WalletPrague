import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { LimitPolicy } from '../../../models/limit-policy.model';
import { CreateLimitPolicyDto, UpdateLimitPolicyDto } from '../dtos/limit-policy.dto';

@Injectable()
export class LimitPoliciesService {
  private readonly logger = new Logger(LimitPoliciesService.name);

  constructor(
    private readonly i18n: I18nService,
    @Inject(getModelToken(LimitPolicy))
    private readonly limitPolicyModel: typeof LimitPolicy,
  ) {}

  /**
   * Create a new limit policy
   */
  async createPolicy(
    createDto: CreateLimitPolicyDto,
    createdBy: string,
  ): Promise<LimitPolicy> {
    // Validate amount constraints
    if (createDto.max_transaction_amount > createDto.max_daily_amount) {
      throw new BadRequestException(
        this.getTranslatedMessage('limits.limit_not_found'),
      );
    }

    if (createDto.max_daily_amount > createDto.max_monthly_amount) {
      throw new BadRequestException(
        this.getTranslatedMessage('limits.limit_not_found'),
      );
    }

    return await this.limitPolicyModel.create({
      ...createDto,
      created_by: createdBy,
    });
  }

  /**
   * Get all active limit policies
   */
  async getAllPolicies(activeOnly = true): Promise<LimitPolicy[]> {
    const where = activeOnly ? { is_active: true } : {};
    return await this.limitPolicyModel.findAll({
      where,
      order: [['policy_code', 'ASC']],
    });
  }

  /**
   * Get policy by ID
   */
  async getPolicyById(policyId: string): Promise<LimitPolicy | null> {
    return await this.limitPolicyModel.findByPk(policyId);
  }

  /**
   * Get policy by code
   */
  async getPolicyByCode(policyCode: string): Promise<LimitPolicy | null> {
    return await this.limitPolicyModel.findOne({
      where: { policy_code: policyCode },
    });
  }

  /**
   * Update a limit policy
   */
  async updatePolicy(
    policyId: string,
    updateDto: UpdateLimitPolicyDto,
  ): Promise<LimitPolicy | null> {
    const policy = await this.limitPolicyModel.findByPk(policyId);

    if (!policy) {
      return null;
    }

    // Validate amount constraints if any amounts are being updated
    const maxTxn = updateDto.max_transaction_amount ?? policy.max_transaction_amount;
    const maxDaily = updateDto.max_daily_amount ?? policy.max_daily_amount;
    const maxMonthly = updateDto.max_monthly_amount ?? policy.max_monthly_amount;

    if (maxTxn > maxDaily) {
      throw new BadRequestException(
        this.getTranslatedMessage('limits.limit_not_found'),
      );
    }

    if (maxDaily > maxMonthly) {
      throw new BadRequestException(
        this.getTranslatedMessage('limits.limit_not_found'),
      );
    }

    await policy.update(updateDto);
    return policy;
  }

  /**
   * Activate or deactivate a policy
   */
  async togglePolicyStatus(policyId: string, isActive: boolean): Promise<LimitPolicy | null> {
    const policy = await this.limitPolicyModel.findByPk(policyId);

    if (!policy) {
      return null;
    }

    policy.is_active = isActive;
    await policy.save();
    return policy;
  }

  /**
   * Delete a policy
   */
  async deletePolicy(policyId: string): Promise<boolean> {
    const result = await this.limitPolicyModel.destroy({
      where: { id: policyId },
    });
    return result > 0;
  }

  /**
   * Create default policies on initialization
   */
  async seedDefaultPolicies(): Promise<void> {
    const existingCount = await this.limitPolicyModel.count();

    if (existingCount > 0) {
      return; // Already seeded
    }

    const defaultPolicies = [
      {
        policy_code: 'standard',
        policy_name: 'Standard User',
        max_transaction_amount: 5000,
        max_daily_amount: 20000,
        max_monthly_amount: 100000,
        max_daily_count: 10,
        max_monthly_count: 100,
        is_active: true,
        description: 'Standard user limits for regular P2P transfers',
      },
      {
        policy_code: 'premium',
        policy_name: 'Premium User',
        max_transaction_amount: 15000,
        max_daily_amount: 75000,
        max_monthly_amount: 500000,
        max_daily_count: 25,
        max_monthly_count: 300,
        is_active: true,
        description: 'Premium user with higher transaction limits',
      },
      {
        policy_code: 'vip',
        policy_name: 'VIP User',
        max_transaction_amount: 50000,
        max_daily_amount: 250000,
        max_monthly_amount: 2000000,
        max_daily_count: 100,
        max_monthly_count: 1000,
        is_active: true,
        description: 'VIP user with maximum limits',
      },
    ];

    await this.limitPolicyModel.bulkCreate(defaultPolicies);
    console.log('✅ Default limit policies seeded');
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
