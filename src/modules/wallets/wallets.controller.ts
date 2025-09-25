import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../models/user.model';

@ApiTags('🔐 Wallets')
@Controller('private/wallets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary:
      '🔐 Get wallet dashboard (balance + recent transactions + user info)',
  })
  @ApiOkResponse({
    description: 'Returns wallet info, user details, and recent transactions',
  })
  async dashboard(
    @GetUser() currentUser: User,
    @Query('currency') currency = 'LPS',
  ) {
    const userId = currentUser.id;
    const wallet = await this.walletsService.getWalletByUser(userId, currency);
    const recent = await this.walletsService.getRecentTransactions(userId, 10);

    if (!wallet) {
      return {
        success: false,
        message: 'Wallet not found for the specified user and currency',
        data: null,
      };
    }

    // Extract user info from wallet association
    const userInfo = wallet.user
      ? {
          id: wallet.user.id,
          name: `${wallet.user.user_first_name} ${wallet.user.user_last_name}`,
          username: wallet.user.user_name,
          email: wallet.user.user_email,
          phone: wallet.user.user_phone_number,
          dni: wallet.user.user_DNI_number,
          status: wallet.user.user_status,
        }
      : null;

    // Clean wallet data (remove user association to avoid duplication)
    const walletData = {
      id: wallet.id,
      wallet_name: wallet.wallet_name,
      currency: wallet.currency,
      available_balance: wallet.available_balance,
      ledger_balance: wallet.ledger_balance,
      status: wallet.status,
      updated_at: wallet.updated_at,
    };

    return {
      success: true,
      data: {
        user: userInfo,
        wallet: walletData,
        recent_transactions: recent,
      },
    };
  }
}
