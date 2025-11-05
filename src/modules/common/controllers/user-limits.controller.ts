import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  HttpCode,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { TransformInterceptor } from '../../../common/interceptors/transform.interceptor';
import { LimitValidationService } from '../services/limit-validation.service';
import { CheckLimitDto } from '../dtos/limit-policy.dto';

@Controller('private/user/account-limits')
@ApiTags('💰 User Account Limits')
@UseInterceptors(TransformInterceptor)
export class UserLimitsController {
  constructor(
    private readonly limitValidationService: LimitValidationService,
  ) {}

  /**
   * POST /v1/private/user/account-limits/check
   * Check if a specific amount is within user limits
   */
  @Post('check')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Check if transaction amount is within limits',
    description: 'Check if a specific amount can be transferred based on user limits',
  })
  async checkLimit(
    @GetUser() user: any,
    @Body() checkLimitDto: CheckLimitDto,
  ) {
    const result = await this.limitValidationService.validateTransaction(
      user.id,
      checkLimitDto.amount,
    );

    return {
      allowed: result.allowed,
      reason: result.reason,
      remaining_daily_amount: result.remaining_daily_amount,
      remaining_daily_count: result.remaining_daily_count,
      remaining_monthly_amount: result.remaining_monthly_amount,
      remaining_monthly_count: result.remaining_monthly_count,
    };
  }
}

