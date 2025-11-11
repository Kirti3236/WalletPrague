import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { I18nModule } from 'nestjs-i18n';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration, { configValidationSchema } from './config/configuration';
import { getDatabaseConfig } from './config/database.config';
import { i18nConfig } from './config/i18n.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ResponseService } from './common/services/response.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { WalletsModule } from './modules/wallets/wallets.module';
import { WithdrawalsModule } from './modules/withdrawals/withdrawals.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { BanksModule } from './modules/banks/banks.module';
import { PaymentMethodsModule } from './modules/payment-methods/payment-methods.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { DepositsModule } from './modules/deposits/deposits.module';
import { StatementsModule } from './modules/statements/statements.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { AMLAlertsModule } from './modules/aml-alerts/aml-alerts.module';
import { RiskModule } from './modules/risk/risk.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CommonModule } from './modules/common/common.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { FeesModule } from './modules/fees/fees.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { RestrictionsModule } from './modules/restrictions/restrictions.module';
import { SeederService } from './seeds/seeder.service';
import { IdempotencyKey } from './models/idempotency-key.model';
import { IdempotencyKeyService } from './common/services/idempotency-key.service';
import { IdempotencyCleanupService } from './common/services/idempotency-cleanup.service';
import { IdempotentInterceptor } from './common/decorators/idempotent.decorator';

@Module({
  imports: [
    // Configuration module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
        skipFunctions: true, // Skip function validation for faster startup
      },
    }),

    // Database module (with error handling)
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        try {
          const config = getDatabaseConfig(configService);
          return config;
        } catch (error) {
          console.error('❌ Database configuration error:', error.message);
          throw error;
        }
      },
      inject: [ConfigService],
    }),

    // Register IdempotencyKey model
    SequelizeModule.forFeature([IdempotencyKey]),

    // Rate limiting (simplified for faster startup)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),

    // Schedule module for background tasks
    ScheduleModule.forRoot(),

    // Internationalization
    I18nModule.forRoot(i18nConfig),

    // Feature modules
    AuthModule,
    UsersModule,
    WalletsModule,
    WithdrawalsModule,
    PaymentsModule,
    TransfersModule,
    BanksModule,
    PaymentMethodsModule,
    TransactionsModule,
    DepositsModule,
    StatementsModule,
    ReconciliationModule,
    RefundsModule,
    
    // New Deliverable 3 modules
    CommonModule,
    AMLAlertsModule,
    RiskModule,
    ReportsModule,
    DashboardModule,
    
    // New modules
    DisputesModule,
    FeesModule,
    SettlementsModule,
    WebhooksModule,
    RestrictionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ResponseService,
    SeederService,
    IdempotencyKeyService,
    IdempotencyCleanupService,
    {
      provide: 'APP_FILTER',
      useClass: GlobalExceptionFilter,
    },
    {
      provide: 'APP_INTERCEPTOR',
      useClass: IdempotentInterceptor,
    },
  ],
})
export class AppModule {}
