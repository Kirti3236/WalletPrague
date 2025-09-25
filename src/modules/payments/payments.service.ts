import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { I18nService } from 'nestjs-i18n';
import { QrCode, QrType, CommonStatus3 } from '../../models/qr-code.model';
import { Transaction, TransactionType } from '../../models/transaction.model';
import { Wallet } from '../../models/wallet.model';
import { User } from '../../models/user.model';
import { Ledger, LedgerEntryType } from '../../models/ledger.model';
import { Sequelize } from 'sequelize-typescript';
import {
  GenerateQrDto,
  GetPaymentCodeDto,
  SharePaymentDto,
  ScanQrDto,
  RedeemByCodeDto,
  ValidateCodeDto,
  GenerateQrResponseDto,
  PaymentCodeDetailsDto,
  SharePaymentResponseDto,
  ValidateCodeResponseDto,
} from './dto/payment-qr.dto';
import { ResponseService } from '../../common/services/response.service';
import { StatusCode } from '../../common/constants/status-codes';

function code(n = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(
    { length: n },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly sequelize: Sequelize,
    private readonly i18n: I18nService,
    @InjectModel(QrCode)
    private qrCodeModel: typeof QrCode,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Wallet)
    private walletModel: typeof Wallet,
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
    private readonly responseService: ResponseService,
  ) {}

  async createPaymentRequest(
    senderUserId: string,
    senderWalletId: string,
    amount: string | number,
    currency = 'LPS',
  ) {
    const amountString =
      typeof amount === 'string' ? amount : amount.toFixed(2);
    const qrPayload = {
      u: senderUserId,
      w: senderWalletId,
      a: amountString,
      c: currency,
      k: code(4) + '-' + code(4),
    };
    const qr = await QrCode.create({
      id: uuidv4(),
      user_id: senderUserId,
      transaction_id: null,
      qr_type: QrType.PAYMENT_REQUEST,
      qr_data: JSON.stringify(qrPayload),
      amount: amountString,
      currency,
      status: CommonStatus3.ACTIVE,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    } as any);
    return {
      amount: amountString,
      currency,
      code: qrPayload.k,
      qr_id: qr.id,
      expires_at: qr.expires_at,
    };
  }

  async redeemPayment(
    qrId: string,
    receiverUserId: string,
    receiverWalletId: string,
  ) {
    return this.sequelize.transaction(async (tx) => {
      const qr = await QrCode.findByPk(qrId, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });
      if (
        !qr ||
        qr.status !== CommonStatus3.ACTIVE ||
        (qr.expires_at && qr.expires_at < new Date())
      ) {
        throw new BadRequestException('invalid_or_expired_qr');
      }
      const payload = JSON.parse(qr.qr_data) as {
        u: string;
        w: string;
        a: string;
        c: string;
      };
      const amount = parseFloat(payload.a);
      const senderWallet = await (Wallet as any).findByPk(payload.w, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });
      const receiverWallet = await (Wallet as any).findByPk(receiverWalletId, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });
      if (!senderWallet || !receiverWallet)
        throw new BadRequestException('wallet_not_found');
      const senderBal = parseFloat(
        senderWallet.available_balance as unknown as string,
      );
      if (senderBal < amount)
        throw new BadRequestException('insufficient_funds');

      const txn = await (Transaction as any).create(
        {
          id: uuidv4(),
          sender_wallet_id: senderWallet.id,
          receiver_wallet_id: receiverWallet.id,
          sender_user_id: payload.u,
          receiver_user_id: receiverUserId,
          type: TransactionType.QR_PAYMENT,
          amount: payload.a,
          currency: payload.c,
          fee_amount: '0.00',
          net_amount: payload.a,
          status: 'completed',
          description: 'Pago QR',
          processed_at: new Date(),
        } as any,
        { transaction: tx },
      );

      // Ledgers
      await (Ledger as any).bulkCreate(
        [
          {
            id: uuidv4(),
            transaction_id: txn.id,
            wallet_id: senderWallet.id,
            entry_type: LedgerEntryType.DEBIT,
            amount: payload.a,
            currency: payload.c,
            description: 'QR payment sent',
          } as any,
          {
            id: uuidv4(),
            transaction_id: txn.id,
            wallet_id: receiverWallet.id,
            entry_type: LedgerEntryType.CREDIT,
            amount: payload.a,
            currency: payload.c,
            description: 'QR payment received',
          } as any,
        ],
        { transaction: tx },
      );

      // Update balances
      senderWallet.available_balance = (senderBal - amount).toFixed(
        2,
      ) as unknown as string;
      const receiverBal = parseFloat(
        receiverWallet.available_balance as unknown as string,
      );
      receiverWallet.available_balance = (receiverBal + amount).toFixed(
        2,
      ) as unknown as string;
      await senderWallet.save({ transaction: tx });
      await receiverWallet.save({ transaction: tx });

      // finalize QR
      qr.status = CommonStatus3.USED;
      qr.used_at = new Date();
      qr.transaction_id = txn.id;
      await qr.save({ transaction: tx });

      return {
        transaction_id: txn.id,
        amount: txn.amount,
        currency: txn.currency,
        status: txn.status,
        processed_at: txn.processed_at,
      };
    });
  }

  async generateQr(
    dto: GenerateQrDto,
    lang: string = 'en',
  ): Promise<GenerateQrResponseDto> {
    try {
      const { user_id, wallet_id, amount, description, currency = 'LPS' } = dto;
      const amountString =
        typeof amount === 'string' ? amount : amount.toFixed(2);

      if (!user_id) {
        throw new BadRequestException('User ID is required');
      }

      // Verify user and wallet exist
      const user = await this.userModel.findByPk(user_id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const wallet = await this.walletModel.findOne({
        where: { id: wallet_id, user_id },
      });
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Generate payment code
      const paymentCode = `${code(4)}-${code(4)}`;

      // Create QR payload
      const qrPayload = {
        u: user_id,
        w: wallet_id,
        a: amountString,
        c: currency,
        k: paymentCode,
        d: description || '',
      };

      // Create QR code record
      const qr = await this.qrCodeModel.create({
        id: uuidv4(),
        user_id,
        transaction_id: null,
        qr_type: QrType.PAYMENT_REQUEST,
        qr_data: JSON.stringify(qrPayload),
        amount: amountString,
        currency,
        status: CommonStatus3.ACTIVE,
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      } as any);

      return {
        qr_id: qr.id,
        code: paymentCode,
        qr_data: JSON.stringify(qrPayload),
        amount: amountString,
        currency,
        description,
        expires_at: qr.expires_at || new Date(),
        created_at: qr.createdAt,
      };
    } catch (error) {
      this.logger.error(`Error generating QR: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPaymentCodeDetails(
    dto: GetPaymentCodeDto,
    lang: string = 'en',
  ): Promise<PaymentCodeDetailsDto> {
    try {
      const { code: paymentCode, user_id } = dto;

      // Find QR code by payment code
      const qr = await this.qrCodeModel.findOne({
        where: {
          qr_data: {
            [Op.like]: `%"k":"${paymentCode}"%`,
          },
          status: {
            [Op.in]: [
              CommonStatus3.ACTIVE,
              CommonStatus3.USED,
              CommonStatus3.EXPIRED,
            ],
          },
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: [
              'id',
              'user_first_name',
              'user_last_name',
              'user_name',
            ],
            required: true,
          },
        ],
      });

      if (!qr) {
        throw new NotFoundException(
          this.getTranslatedMessage('payments.payment_code_not_found', lang),
        );
      }

      const qrData = JSON.parse(qr.qr_data);
      const isExpired = qr.expires_at ? new Date() > qr.expires_at : false;
      const isValid = qr.status === CommonStatus3.ACTIVE && !isExpired;

      return {
        code: paymentCode,
        qr_id: qr.id,
        amount: qr.amount || '0.00',
        currency: qr.currency || 'LPS',
        description: qrData.d || '',
        status: qr.status,
        is_expired: isExpired,
        is_valid: isValid,
        sender: {
          name: `${(qr as any).user?.user_first_name || ''} ${(qr as any).user?.user_last_name || ''}`.trim(),
          username: (qr as any).user?.user_name || '',
        },
        expires_at: qr.expires_at || new Date(),
        created_at: qr.createdAt,
      };
    } catch (error) {
      this.logger.error(
        `Error getting payment code details: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async sharePayment(
    dto: SharePaymentDto,
    lang: string = 'en',
  ): Promise<SharePaymentResponseDto> {
    try {
      const { qr_id, user_id, share_method = 'link' } = dto;

      // Find QR code
      const qr = await this.qrCodeModel.findOne({
        where: { id: qr_id, user_id },
      });

      if (!qr) {
        throw new NotFoundException('Payment request not found');
      }

      if (qr.status !== CommonStatus3.ACTIVE) {
        throw new BadRequestException('Payment request is no longer active');
      }

      const qrData = JSON.parse(qr.qr_data);
      const baseUrl = process.env.APP_BASE_URL || 'https://yapague.com';

      let shareContent = '';

      switch (share_method) {
        case 'whatsapp':
          shareContent = `💰 YaPague Payment Request\n\nAmount: ${qr.amount} ${qr.currency}\nCode: ${qrData.k}\n\nPay now: ${baseUrl}/pay/${qrData.k}`;
          break;
        case 'sms':
          shareContent = `YaPague Payment: ${qr.amount} ${qr.currency}. Code: ${qrData.k}. Pay: ${baseUrl}/pay/${qrData.k}`;
          break;
        case 'email':
          shareContent = `You have received a payment request for ${qr.amount} ${qr.currency}. Use code ${qrData.k} or visit ${baseUrl}/pay/${qrData.k}`;
          break;
        default: // link
          shareContent = `${baseUrl}/pay/${qrData.k}`;
      }

      return {
        share_content: shareContent,
        share_method,
        qr_code: qr.qr_data,
        payment_details: {
          amount: qr.amount || '0.00',
          currency: qr.currency || 'LPS',
          description: qrData.d || '',
          code: qrData.k,
        },
      };
    } catch (error) {
      this.logger.error(`Error sharing payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async scanQr(dto: ScanQrDto, lang: string = 'en'): Promise<any> {
    try {
      const { qr_data, scanner_user_id, scanner_wallet_id } = dto;

      if (!scanner_user_id) {
        throw new BadRequestException('Scanner user ID is required');
      }

      let qrPayload;
      try {
        qrPayload = JSON.parse(qr_data);
      } catch {
        // If not JSON, treat as payment code
        return await this.redeemByCode(
          {
            code: qr_data,
            receiver_user_id: scanner_user_id,
            receiver_wallet_id: scanner_wallet_id,
          },
          lang,
        );
      }

      // Validate QR payload structure
      if (!qrPayload.k || !qrPayload.u || !qrPayload.w || !qrPayload.a) {
        throw new BadRequestException(
          this.getTranslatedMessage('payments.invalid_qr_format', lang),
        );
      }

      // Use existing redeem logic
      return await this.redeemByCode(
        {
          code: qrPayload.k,
          receiver_user_id: scanner_user_id,
          receiver_wallet_id: scanner_wallet_id,
        },
        lang,
      );
    } catch (error) {
      this.logger.error(`Error scanning QR: ${error.message}`, error.stack);
      throw error;
    }
  }

  async redeemByCode(dto: RedeemByCodeDto, lang: string = 'en'): Promise<any> {
    try {
      const { code: paymentCode, receiver_user_id, receiver_wallet_id } = dto;

      // Find QR code by payment code
      const qr = await this.qrCodeModel.findOne({
        where: {
          qr_data: {
            [Op.like]: `%"k":"${paymentCode}"%`,
          },
          status: CommonStatus3.ACTIVE,
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['user_first_name', 'user_last_name'],
            required: true,
          },
        ],
      });

      if (!qr) {
        throw new NotFoundException(
          this.getTranslatedMessage(
            'payments.payment_code_not_found_or_expired',
            lang,
          ),
        );
      }

      // Check if QR code is expired
      const isExpired = qr.expires_at ? new Date() > qr.expires_at : false;
      if (isExpired) {
        throw new BadRequestException(
          this.getTranslatedMessage('payments.payment_code_expired', lang),
        );
      }

      // Check if QR code is already used
      const isUsed = qr.status === CommonStatus3.USED;
      if (isUsed) {
        throw new BadRequestException(
          this.getTranslatedMessage('payments.payment_code_already_used', lang),
        );
      }

      // Use existing redeem logic
      return await this.createPaymentRequest(
        receiver_user_id,
        receiver_wallet_id,
        qr.amount?.toString() || '0',
        qr.currency || 'HNL',
      );
    } catch (error) {
      this.logger.error(
        `Error redeeming by code: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async validateCode(
    dto: ValidateCodeDto,
    lang: string = 'en',
  ): Promise<ValidateCodeResponseDto> {
    try {
      const { code: paymentCode, user_id } = dto;

      // Find QR code by payment code
      const qr = await this.qrCodeModel.findOne({
        where: {
          qr_data: {
            [Op.like]: `%"k":"${paymentCode}"%`,
          },
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['user_first_name', 'user_last_name'],
            required: true,
          },
        ],
      });

      if (!qr) {
        return {
          is_valid: false,
          message: 'Payment code not found',
        };
      }

      const isExpired = qr.expires_at ? new Date() > qr.expires_at : false;
      const isUsed = qr.status === CommonStatus3.USED;
      const isActive = qr.status === CommonStatus3.ACTIVE;

      if (isUsed) {
        return {
          is_valid: false,
          message: 'Payment code has already been used',
          status: qr.status,
          is_expired: false,
        };
      }

      if (isExpired) {
        return {
          is_valid: false,
          message: 'Payment code has expired',
          status: qr.status,
          is_expired: true,
        };
      }

      if (!isActive) {
        return {
          is_valid: false,
          message: 'Payment code is not active',
          status: qr.status,
          is_expired: isExpired,
        };
      }

      const qrData = JSON.parse(qr.qr_data);

      return {
        is_valid: true,
        message: 'Payment code is valid',
        status: qr.status,
        is_expired: false,
        payment_details: {
          amount: qr.amount || '0.00',
          currency: qr.currency || 'LPS',
          description: qrData.d || '',
          sender_name:
            `${(qr as any).user?.user_first_name || ''} ${(qr as any).user?.user_last_name || ''}`.trim(),
          expires_at: qr.expires_at || new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`Error validating code: ${error.message}`, error.stack);
      throw error;
    }
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
      this.logger.warn(`Translation not found for key: ${key}, lang: ${lang}`);
      return key; // Fallback to key if translation fails
    }
  }
}
