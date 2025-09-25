import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
import { User } from '../../models/user.model';

@ApiTags('🔐 Withdrawals')
@Controller('private/withdrawals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post('generate')
  @ApiOperation({ summary: '🔐 Generate a cash withdrawal code (24h expiry)' })
  @ApiOkResponse({ description: 'Returns code and expiry; safe response' })
  @ApiBody({ type: GenerateWithdrawalDto })
  async generate(
    @Body() dto: GenerateWithdrawalDto,
    @GetUser() currentUser: User,
  ) {
    // Override user_id with current user from JWT
    dto.user_id = currentUser.id;
    const res = await this.withdrawalsService.generateWithdrawal(
      dto.user_id,
      dto.wallet_id,
      dto.amount,
      dto.currency ?? 'LPS',
    );
    return res;
  }
}
