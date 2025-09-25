import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import {
  PaymentMethod,
  PaymentMethodBrand,
  PaymentMethodType,
} from '../../models/payment-method.model';

export interface AddStaticCardDto {
  user_id: string;
  brand: PaymentMethodBrand;
  last4: string;
  expiry_month: number;
  expiry_year: number;
  is_default?: boolean;
}

export interface AddBankAccountDto {
  user_id: string;
  bank_name: string;
  account_type: 'checking' | 'savings';
  last4: string;
  is_default?: boolean;
}

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectModel(PaymentMethod)
    private readonly paymentMethods: typeof PaymentMethod,
    private readonly i18n: I18nService,
  ) {}

  async addStaticCard(dto: AddStaticCardDto) {
    // Use build/save to avoid CreationAttributes typing friction
    const instance = this.paymentMethods.build({
      user_id: dto.user_id,
      type: PaymentMethodType.CARD,
      brand: dto.brand,
      last4: dto.last4,
      expiry_month: dto.expiry_month,
      expiry_year: dto.expiry_year,
      is_default: dto.is_default ?? false,
      is_active: true,
      gateway: 'static',
    } as any);
    const created = await instance.save();
    return this.toSafe(created);
  }

  async addBankAccount(dto: AddBankAccountDto) {
    // Use build/save to avoid CreationAttributes typing friction
    const instance = this.paymentMethods.build({
      user_id: dto.user_id,
      type: PaymentMethodType.BANK_ACCOUNT,
      bank_name: dto.bank_name,
      account_type: dto.account_type,
      last4: dto.last4,
      is_default: dto.is_default ?? false,
      is_active: true,
      gateway: 'static',
    } as any);
    const created = await instance.save();
    return this.toSafe(created);
  }

  async listUserCards(userId: string) {
    const rows = await this.paymentMethods.findAll({
      where: { user_id: userId, type: PaymentMethodType.CARD, is_active: true },
      order: [['createdAt', 'DESC']],
    });
    return rows.map(this.toSafe);
  }

  async listUserBankAccounts(userId: string) {
    const rows = await this.paymentMethods.findAll({
      where: {
        user_id: userId,
        type: PaymentMethodType.BANK_ACCOUNT,
        is_active: true,
      },
      order: [['createdAt', 'DESC']],
    });
    return rows.map(this.toSafe);
  }

  async deleteCard(userId: string, id: string, lang: string = 'en') {
    const row = await this.paymentMethods.findOne({
      where: { id, user_id: userId },
    });
    if (!row) {
      throw new NotFoundException(
        this.getTranslatedMessage('error.notFound', lang),
      );
    }
    await row.update({ is_active: false });
    return { success: true };
  }

  /**
   * Get translated message using i18n service with fallback
   */
  private getTranslatedMessage(
    key: string,
    lang: string = 'en',
    params?: any,
  ): string {
    try {
      return this.i18n.t(`messages.${key}`, { lang, args: params });
    } catch (error) {
      return key; // Fallback to key if translation fails
    }
  }

  private toSafe = (pm: PaymentMethod) => {
    const json = pm.toJSON();
    delete json.gateway_token;
    return json;
  };
}
