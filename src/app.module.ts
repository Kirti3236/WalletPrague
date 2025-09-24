import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { SeederService } from './seeds/seeder.service';

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

    // Rate limiting (simplified for faster startup)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),

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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ResponseService,
    SeederService,
    {
      provide: 'APP_FILTER',
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
