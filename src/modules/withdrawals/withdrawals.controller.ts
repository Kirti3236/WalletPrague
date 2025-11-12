import { Body, Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WithdrawalsService } from './withdrawals.service';
import { GenerateWithdrawalDto } from './dto/generate-withdrawal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
// ✅ PHASE 2: Import Idempotent decorator
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { User } from '../../models/user.model';

@ApiTags('🔐 Withdrawals')
@Controller('private/withdrawals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  // ✅ PHASE 2: Add Idempotent decorator for retry safety
  @Idempotent()
  @ApiOperation({
    summary: '🔐 Generate a cash withdrawal code (24h expiry)',
    description: `
**PRIVATE ENDPOINT** - Generate a withdrawal code for cash pickup.

**Features:**
- Generate unique withdrawal code
- 24-hour expiry time
- Real-time balance deduction
- Ledger entry recording
- Idempotent: Safe to retry with same Idempotency-Key header

**Use Cases:**
- Create cash pickup codes
- Generate ATM withdrawal requests
- Generate withdrawal codes for cashier transactions

**Note:** Amount is immediately deducted from wallet.
    `,
  })
  @ApiOkResponse({ description: 'Returns code and expiry; safe response' })
  @ApiBody({ type: GenerateWithdrawalDto })
  async generate(
    @Body() dto: GenerateWithdrawalDto,
    @GetUser() currentUser: User,
  ) {
    // Use provided user_id if present, otherwise default to JWT token's user_id
    if (!dto.user_id) {
    dto.user_id = currentUser.id;
    }
    const res = await this.withdrawalsService.generateWithdrawal(
      dto.user_id,
      dto.wallet_id,
      dto.amount,
      dto.currency ?? 'LPS',
    );
    return res;
  }
}
