import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  BadRequestException,
  NotFoundException,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../models/user.model';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { TransformInterceptor } from '../../../common/interceptors/transform.interceptor';
import { AccountingService } from '../services/accounting.service';
import {
  CreateChartOfAccountsDto,
  UpdateChartOfAccountsDto,
  CreateJournalDto,
  CreateJournalEntryDto,
  ReverseJournalEntryDto,
  TrialBalanceFilterDto,
  AccountLedgerFilterDto,
  ZeroSumValidationDto,
} from '../dtos/accounting.dto';

@Controller('private/admin/accounting')
@ApiTags('📊 Accounting & Double-Entry Bookkeeping')
@UseInterceptors(TransformInterceptor)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  /**
   * GET /v1/private/admin/accounting/accounts - List chart of accounts
   */
  @Get('accounts')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List chart of accounts' })
  async listAccounts() {
    return this.accountingService.listChartOfAccounts();
  }

  /**
   * POST /v1/private/admin/accounting/accounts - Create new accounting account
   */
  @Post('accounts')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new accounting account' })
  async createAccount(@Body() dto: CreateChartOfAccountsDto, @GetUser() user: any) {
    return this.accountingService.createChartOfAccount(dto, user.id);
  }

  /**
   * PATCH /v1/private/admin/accounting/accounts/:id - Update accounting account
   */
  @Put('accounts/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update accounting account' })
  async updateAccount(@Param('id') id: string, @Body() dto: UpdateChartOfAccountsDto) {
    return this.accountingService.updateChartOfAccount(id, dto);
  }

  /**
   * GET /v1/private/admin/accounting/trial-balance
   * Get trial balance (all accounts with balances)
   */
  @Get('trial-balance')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get trial balance',
    description: 'Admin: Get trial balance showing all accounts with debit/credit balances',
  })
  async getTrialBalance(@Query() filters: TrialBalanceFilterDto) {
    const asOfDate = filters.as_of_date ? new Date(filters.as_of_date) : undefined;
    return await this.accountingService.generateTrialBalance(asOfDate);
  }

  /**
   * POST /v1/private/admin/accounting/journal-entries
   * Create a journal entry
   */
  @Post('journal-entries')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(201)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create journal entry',
    description: 'Admin: Create double-entry journal entry (debit one account, credit another)',
  })
  async createJournalEntry(
    @GetUser() user: any,
    @Body() entryDto: CreateJournalEntryDto,
  ) {
    return await this.accountingService.createJournalEntry(
      {
        journal_id: entryDto.journal_id,
        entry_date: new Date(entryDto.entry_date),
        description: entryDto.description,
        debit_account_id: entryDto.debit_account_id,
        credit_account_id: entryDto.credit_account_id,
        amount: entryDto.amount,
        transaction_id: entryDto.transaction_id,
        transaction_type: entryDto.transaction_type,
      },
      user.id,
    );
  }

  /**
   * GET /v1/private/admin/accounting/account/:id/ledger
   * Get account ledger (all entries for specific account)
   */
  @Get('account/:id/ledger')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get account ledger',
    description: 'Admin: Get all journal entries for a specific account',
  })
  async getAccountLedger(
    @Param('id') accountId: string,
    @Query() filters: AccountLedgerFilterDto,
  ) {
    const startDate = filters.start_date ? new Date(filters.start_date) : undefined;
    const endDate = filters.end_date ? new Date(filters.end_date) : undefined;

    const ledger = await this.accountingService.getAccountLedger(
      accountId,
      startDate,
      endDate,
    );

    if (!ledger || ledger.length === 0) {
      return {
        account_id: accountId,
        entries: [],
        message: 'No entries found for this account',
      };
    }

    return {
      account_id: accountId,
      total_entries: ledger.length,
      entries: ledger,
    };
  }

  /**
   * PUT /v1/private/admin/accounting/journal-entries/:id/reverse
   * Reverse a journal entry
   */
  @Put('journal-entries/:id/reverse')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reverse journal entry',
    description: 'Admin: Create reversing entry (opposite debits and credits)',
  })
  async reverseJournalEntry(
    @Param('id') entryId: string,
    @GetUser() user: any,
  ) {
    return await this.accountingService.reverseJournalEntry(entryId, user.id);
  }

  /**
   * POST /v1/private/admin/accounting/validate-zero-sum
   * Validate zero-sum for a period
   */
  @Post('validate-zero-sum')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Validate zero-sum',
    description: 'Admin: Validate that debits equal credits for a period',
  })
  async validateZeroSum(@Body() validationDto: ZeroSumValidationDto) {
    const result = await this.accountingService.validateZeroSum(
      new Date(validationDto.start_date),
      new Date(validationDto.end_date),
    );

    return {
      valid: result.valid,
      message: result.valid
        ? 'Accounting entries are balanced (debits = credits)'
        : 'Accounting entries are NOT balanced',
      errors: result.errors,
    };
  }


  /**
   * GET /v1/private/admin/accounting/account/:id/balance
   * Get account balance
   */
  @Get('account/:id/balance')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get account balance',
    description: 'Admin: Get current balance for a specific account',
  })
  async getAccountBalance(
    @Param('id') accountId: string,
    @Query('as_of_date') asOfDate?: string,
  ) {
    const balance = await this.accountingService.getAccountBalance(
      accountId,
      asOfDate ? new Date(asOfDate) : undefined,
    );

    return {
      account_id: accountId,
      balance,
      as_of_date: asOfDate || new Date().toISOString(),
    };
  }

  /**
   * POST /v1/private/admin/accounting/journals - Create new journal
   */
  @Post('journals')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(201)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new journal' })
  async createJournal(@Body() dto: CreateJournalDto, @GetUser() user: any) {
    return await this.accountingService.createJournal(dto, user.id);
  }

  /**
   * GET /v1/private/admin/accounting/journals - List all journals
   */
  @Get('journals')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all journals' })
  async listJournals() {
    return await this.accountingService.listJournals();
  }

  /**
   * GET /v1/private/admin/accounting/journals/:id - Get journal by ID
   */
  @Get('journals/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get journal by ID' })
  async getJournal(@Param('id') id: string) {
    return await this.accountingService.getJournalById(id);
  }

  /**
   * GET /v1/private/admin/accounting/journals/:id/entries - Get journal entries
   */
  @Get('journals/:id/entries')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all entries for a journal' })
  async getJournalEntries(@Param('id') id: string) {
    return await this.accountingService.getJournalEntries(id);
  }

  /**
   * POST /v1/private/admin/accounting/journals/:id/post - Post journal (mark as final)
   */
  @Post('journals/:id/post')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Post journal (mark as final)' })
  async postJournal(@Param('id') id: string, @GetUser() user: any) {
    return await this.accountingService.postJournal(id, user.id);
  }

  /**
   * POST /v1/private/admin/accounting/journals/:id/reverse - Reverse all journal entries
   */
  @Post('journals/:id/reverse')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reverse all journal entries' })
  async reverseJournal(@Param('id') id: string, @GetUser() user: any) {
    return await this.accountingService.reverseJournal(id, user.id);
  }
}
