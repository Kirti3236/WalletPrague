import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScheduleModule } from '@nestjs/schedule';

// Limit Models
import { LimitPolicy } from '../../models/limit-policy.model';
import { UserLimit } from '../../models/user-limit.model';
import { LimitCounterDaily } from '../../models/limit-counter-daily.model';
import { LimitCounterMonthly } from '../../models/limit-counter-monthly.model';

// Accounting Models
import { ChartOfAccounts } from '../../models/chart-of-accounts.model';
import { Journal } from '../../models/journal.model';
import { JournalEntry } from '../../models/journal-entry.model';
import { GeneralLedger } from '../../models/general-ledger.model';

// Audit Log Models
import { AuditLog } from '../../models/audit-log.model';

// Limit Services
import { LimitPoliciesService } from './services/limit-policies.service';
import { LimitCountersService } from './services/limit-counters.service';
import { LimitValidationService } from './services/limit-validation.service';
import { LimitResetService } from './services/limit-reset.service';

// Accounting Services
import { AccountingService } from './services/accounting.service';
import { AuditLogService } from './services/audit-log.service';

// Controllers
import { LimitsController } from './controllers/limits.controller';
import { UserLimitsController } from './controllers/user-limits.controller';
import { AdminLimitsController } from './controllers/admin-limits.controller';
import { AccountingController } from './controllers/accounting.controller';
import { AuditLogsController, UserAuditTrailController } from './controllers/audit-logs.controller';

// Interceptors
import { AuditLoggingInterceptor } from './interceptors/audit-logging.interceptor';

@Module({
  imports: [
    SequelizeModule.forFeature([
      // Limit Models
      LimitPolicy,
      UserLimit,
      LimitCounterDaily,
      LimitCounterMonthly,
      // Accounting Models
      ChartOfAccounts,
      Journal,
      JournalEntry,
      GeneralLedger,
      AuditLog,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    LimitsController, 
    UserLimitsController, 
    AdminLimitsController,
    AccountingController, 
    AuditLogsController, 
    UserAuditTrailController
  ],
  providers: [
    // Limit Services
    LimitPoliciesService,
    LimitCountersService,
    LimitValidationService,
    LimitResetService,
    // Accounting Services
    AccountingService,
    AuditLogService,
    {
      provide: 'APP_INTERCEPTOR',
      useClass: AuditLoggingInterceptor,
    },
  ],
  exports: [
    // Limit Services
    LimitPoliciesService,
    LimitCountersService,
    LimitValidationService,
    LimitResetService,
    // Accounting Services
    AccountingService,
    AuditLogService,
  ],
})
export class CommonModule {}
