import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Currency } from '../models/currency.model';
import { TxnStatus } from '../models/txn-status.model';
import { DisputeStatusCatalog } from '../models/dispute-status.model';
import { FeePolicy } from '../models/fee-policy.model';
import { Sequelize } from 'sequelize-typescript';
import { User } from '../models/user.model';
import { Wallet } from '../models/wallet.model';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);
  constructor(private readonly sequelize: Sequelize) {}

  async onModuleInit() {
    // Enable lightweight seeding for local development
    try {
      await this.seedCurrencies();
      await this.seedTxnStatuses();
      await this.seedDisputeStatuses();
      await this.seedFeePolicies();
      await this.ensureDefaultWallets();
      await this.tryDedupeUsers();
      this.logger.log('✅ Database seed completed');
    } catch (e) {
      this.logger.warn(`Seeding skipped/partial: ${e instanceof Error ? e.message : e}`);
    }
  }

  private async tryDedupeUsers() {
    try {
      // Remove duplicate user_email rows, keep earliest id
      await this.sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'yapague_users'
          ) THEN
            DELETE FROM yapague_users a
            USING yapague_users b
            WHERE a.user_email IS NOT NULL
              AND a.user_email = b.user_email
              AND a.id > b.id;

            DELETE FROM yapague_users a
            USING yapague_users b
            WHERE a.user_phone_number IS NOT NULL
              AND a.user_phone_number = b.user_phone_number
              AND a.id > b.id;
          END IF;
        END$$;
      `);
    } catch (e) {
      this.logger.warn(`Dedup users skipped: ${e instanceof Error ? e.message : e}`);
    }
  }

  private async seedCurrencies() {
    const existing = await Currency.findOne({ where: { iso_code: 'HNL' } });
    if (!existing) {
      await Currency.create({
        iso_code: 'HNL',
        name: 'Honduran Lempira',
        symbol: 'L',
        decimal_places: 2,
        is_active: true,
        exchange_rate_usd: null as unknown as string,
      } as any);
      this.logger.log('Seeded currency HNL');
    }
  }

  private async seedTxnStatuses() {
    const codes = ['pending', 'processing', 'completed', 'failed', 'expired', 'cancelled', 'rejected'];
    for (const code of codes) {
      const found = await TxnStatus.findByPk(code);
      if (!found) {
        await TxnStatus.create({ code, label: code.toUpperCase() } as any);
      }
    }
  }

  private async seedDisputeStatuses() {
    const codes = ['initiated', 'under_review', 'resolved', 'rejected'];
    for (const code of codes) {
      const found = await DisputeStatusCatalog.findByPk(code);
      if (!found) {
        await DisputeStatusCatalog.create({ code, label: code.toUpperCase() } as any);
      }
    }
  }

  private async seedFeePolicies() {
    const defaults: Array<{ code: string; amount: string; description: string }> = [
      { code: 'transfer_fee_flat', amount: '0.50', description: 'Default P2P transfer flat fee' },
      { code: 'withdrawal_fee_flat', amount: '0.50', description: 'Default withdrawal flat fee' },
    ];
    for (const def of defaults) {
      const found = await FeePolicy.findByPk(def.code);
      if (!found) {
        await FeePolicy.create({ code: def.code, amount: def.amount, currency: 'HNL', is_active: true, description: def.description } as any);
      }
    }
  }

  /**
   * Ensure each user has at least one wallet in local dev to allow payments tests
   */
  private async ensureDefaultWallets() {
    try {
      const users = await User.findAll();
      for (const u of users) {
        const existing = await Wallet.findOne({ where: { user_id: u.id, currency: 'LPS' } as any });
        if (!existing) {
          await Wallet.create({
            user_id: u.id,
            wallet_name: 'Primary LPS',
            currency: 'LPS',
            available_balance: '0.00',
            ledger_balance: '0.00',
            reserved_balance: '0.00',
            status: 'active',
          } as any);
          this.logger.log(`Created default wallet for user ${u.id}`);
        }
      }
    } catch (e) {
      this.logger.warn(`ensureDefaultWallets skipped: ${e instanceof Error ? e.message : e}`);
    }
  }
}


