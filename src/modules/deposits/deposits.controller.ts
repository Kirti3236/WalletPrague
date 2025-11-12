import { Body, Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { DepositsService } from './deposits.service';
import { DepositFromCardDto, DepositFromBankDto } from './dto/deposit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
// ✅ PHASE 2: Import Idempotent decorator
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { User } from '../../models/user.model';

@ApiTags('🔐 Deposits')
@Controller('private/deposits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Post('from-card')
  @HttpCode(HttpStatus.OK)
  // ✅ PHASE 2: Add Idempotent decorator for retry safety
  @Idempotent()
  @ApiOperation({
    summary: 'Deposit money from saved card to wallet',
    description: `
**PRIVATE ENDPOINT** - Add money to wallet using a saved card.

**Features:**
- Uses stored payment method (card)
- Simulated payment processing (no real charges)
- Automatic fee calculation
- Double-entry ledger recording
- Real-time balance update
- Idempotent: Safe to retry with same Idempotency-Key header

**Use Cases:**
- Top up wallet from credit/debit card
- Add funds for payments and transfers
- Simulate card-based deposits

**Note:** This is a simulation - no real payment processing occurs.
    `,
  })
  @ApiOkResponse({ description: 'Deposit completed successfully' })
  @ApiBody({ type: DepositFromCardDto })
  @ApiResponse({
    status: 200,
    description: 'Deposit processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters or card not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Card not found or not active',
  })
  async depositFromCard(
    @Body() dto: DepositFromCardDto,
    @GetUser() currentUser: User,
  ) {
    // Use provided user_id if present, otherwise default to JWT token's user_id
    if (!dto.user_id) {
    dto.user_id = currentUser.id;
    }
    // At this point, user_id is guaranteed to be set
    return this.depositsService.depositFromCard(dto as Required<DepositFromCardDto>);
  }

  @Post('from-bank')
  @HttpCode(HttpStatus.OK)
  // ✅ PHASE 2: Add Idempotent decorator for retry safety
  @Idempotent()
  @ApiOperation({
    summary: 'Deposit money from saved bank account to wallet',
    description: `
**PRIVATE ENDPOINT** - Add money to wallet using a saved bank account.

**Features:**
- Uses stored payment method (bank account)
- Simulated bank transfer processing
- Automatic fee calculation
- Double-entry ledger recording
- Real-time balance update
- Idempotent: Safe to retry with same Idempotency-Key header

**Use Cases:**
- Top up wallet from linked bank account
- Add funds for payments and transfers
- Simulate bank-based deposits

**Note:** This is a simulation - no real payment processing occurs.
    `,
  })
  @ApiOkResponse({ description: 'Deposit completed successfully' })
  @ApiBody({ type: DepositFromBankDto })
  @ApiResponse({
    status: 200,
    description: 'Deposit processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters or account not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank account not found or not active',
  })
  async depositFromBank(
    @Body() dto: DepositFromBankDto,
    @GetUser() currentUser: User,
  ) {
    // Use provided user_id if present, otherwise default to JWT token's user_id
    if (!dto.user_id) {
    dto.user_id = currentUser.id;
    }
    // At this point, user_id is guaranteed to be set
    return this.depositsService.depositFromBank(dto as Required<DepositFromBankDto>);
  }
}
