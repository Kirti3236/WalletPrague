import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Lang } from '../../common/decorators/lang.decorator';
import { User } from '../../models/user.model';
import { TransactionsService } from './transactions.service';
import {
  TransactionHistoryDto,
  TransactionSearchDto,
  TransactionHistoryResponseDto,
} from './dto/transaction-history.dto';
import { ResponseService } from '../../common/services/response.service';
import { StatusCode } from '../../common/constants/status-codes';

@ApiTags('🔐 Transactions')
@Controller('private/transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly responseService: ResponseService,
  ) {}

  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Get paginated transaction history',
    description: `
**PRIVATE ENDPOINT** - Retrieve user's transaction history with advanced filtering and pagination.

**Features:**
- Paginated results with customizable page size
- Filter by transaction type (payments, collections, deposits, withdrawals, transfers)
- Date range filtering
- Amount range filtering
- Currency filtering
- Transaction summary statistics

**Use Cases:**
- Display transaction history in mobile app
- Generate transaction reports
- Search and filter past transactions
- Export transaction data
    `,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: [
      'all',
      'payments',
      'collections',
      'deposits',
      'withdrawals',
      'transfers',
    ],
    description: 'Transaction type filter',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({
    name: 'min_amount',
    required: false,
    type: String,
    description: 'Minimum amount',
  })
  @ApiQuery({
    name: 'max_amount',
    required: false,
    type: String,
    description: 'Maximum amount',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    enum: ['LPS', 'USD'],
    description: 'Currency filter',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved successfully',
    type: TransactionHistoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getTransactionHistory(
    @Query() query: any,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    try {
      // Build DTO from query parameters
      const dto: TransactionHistoryDto = {
        user_id: currentUser.id,
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 20,
        type: query.type || 'all',
        start_date: query.start_date,
        end_date: query.end_date,
        min_amount: query.min_amount,
        max_amount: query.max_amount,
        currency: query.currency,
      };

      // Validate pagination parameters
      if (dto.page && dto.page < 1) {
        throw new BadRequestException('Page must be at least 1');
      }
      if (dto.limit && (dto.limit < 1 || dto.limit > 100)) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      // Validate date range
      if (dto.start_date && dto.end_date) {
        const startDate = new Date(dto.start_date);
        const endDate = new Date(dto.end_date);
        if (startDate > endDate) {
          throw new BadRequestException('Start date must be before end date');
        }
      }

      // Validate amount range
      if (dto.min_amount && dto.max_amount) {
        const minAmount = parseFloat(dto.min_amount);
        const maxAmount = parseFloat(dto.max_amount);
        if (minAmount > maxAmount) {
          throw new BadRequestException(
            'Minimum amount must be less than maximum amount',
          );
        }
      }

      const result = await this.transactionsService.getTransactionHistory(
        dto,
        lang,
      );

      return this.responseService.success(
        result,
        StatusCode.SUCCESS,
        undefined,
        lang,
      );
    } catch (error) {
      throw error;
    }
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Search transactions',
    description: `
**PRIVATE ENDPOINT** - Search user's transactions by description/notes or specific amount.

**Features:**
- Full-text search in transaction descriptions
- Exact amount matching
- Paginated results
- Case-insensitive search

**Use Cases:**
- Find specific transactions by description
- Search for transactions with specific amounts
- Quick transaction lookup
    `,
  })
  @ApiQuery({
    name: 'query',
    required: false,
    type: String,
    description: 'Search query for description/notes',
  })
  @ApiQuery({
    name: 'amount',
    required: false,
    type: String,
    description: 'Exact amount to search for',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: TransactionHistoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid search parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async searchTransactions(
    @Query() query: any,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    try {
      // Validate search parameters
      if (!query.query && !query.amount) {
        throw new BadRequestException(
          'Either query or amount parameter is required',
        );
      }

      // Build DTO from query parameters
      const dto: TransactionSearchDto = {
        user_id: currentUser.id,
        query: query.query,
        amount: query.amount,
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 20,
      };

      // Validate pagination parameters
      if (dto.page && dto.page < 1) {
        throw new BadRequestException('Page must be at least 1');
      }
      if (dto.limit && (dto.limit < 1 || dto.limit > 50)) {
        throw new BadRequestException('Limit must be between 1 and 50');
      }

      const result = await this.transactionsService.searchTransactions(
        dto,
        lang,
      );

      return this.responseService.success(
        result,
        StatusCode.SUCCESS,
        undefined,
        lang,
      );
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Get detailed transaction information',
    description: `
**PRIVATE ENDPOINT** - Retrieve comprehensive details for a specific transaction.

**Features:**
- Complete transaction information
- Sender and receiver details
- Wallet information
- Fee breakdown
- Processing timestamps
- Gateway references

**Use Cases:**
- Display transaction receipt
- Transaction dispute information
- Detailed transaction analysis
- Customer support queries
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction details retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid transaction ID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found or access denied',
  })
  async getTransactionDetails(
    @Param('id') transactionId: string,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    try {
      // Validate UUID format
      if (!this.isValidUUID(transactionId)) {
        throw new BadRequestException(
          'Invalid transaction ID format. Must be a valid UUID.',
        );
      }

      const result = await this.transactionsService.getTransactionDetails(
        transactionId,
        currentUser.id,
        lang,
      );

      return this.responseService.success(
        result,
        StatusCode.SUCCESS,
        undefined,
        lang,
      );
    } catch (error) {
      throw error;
    }
  }
}
