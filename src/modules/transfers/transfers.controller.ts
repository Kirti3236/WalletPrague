import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { TransfersService } from './transfers.service';
import { P2PTransferDto } from './dto/p2p-transfer.dto';
import {
  ValidateRecipientDto,
  TransferByDniDto,
  TransferConfirmationDto,
} from './dto/validate-recipient.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Lang } from '../../common/decorators/lang.decorator';
// ✅ PHASE 2: Import Idempotent decorator
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { User } from '../../models/user.model';
import { ResponseService } from '../../common/services/response.service';
import { StatusCode } from '../../common/constants/status-codes';
import { Wallet } from '../../models/wallet.model';

@ApiTags('🔐 Transfers')
@Controller('private/transfers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TransfersController {
  constructor(
    private readonly transfersService: TransfersService,
    private readonly responseService: ResponseService,
    private readonly i18n: I18nService,
  ) {}

  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Get translated message using i18n service with fallback
   */
  private getTranslatedMessage(
    key: string,
    lang: string = 'en',
    params?: any,
  ): string {
    try {
      return this.i18n.t(`messages.${key}`, { lang, args: params });
    } catch (error) {
      return key; // Fallback to key if translation fails
    }
  }

  @Post('validate-recipient')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Validate recipient by DNI before transfer',
    description: `
**PRIVATE ENDPOINT** - Validate if a recipient exists and can receive transfers using their DNI number.

**Features:**
- Check if recipient exists by DNI
- Verify recipient account status
- Get recipient's available wallets
- Prevent self-transfers
- Return recipient basic information

**Use Cases:**
- Pre-validate recipient before showing transfer form
- Display recipient name and available wallets
- Prevent invalid transfer attempts
    `,
  })
  @ApiBody({ type: ValidateRecipientDto })
  @ApiResponse({
    status: 200,
    description: 'Recipient validation completed',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid DNI format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Sender not found',
  })
  async validateRecipient(
    @Body() dto: ValidateRecipientDto,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    try {
      // Override sender_user_id with current user
      dto.sender_user_id = currentUser.id;

      const result = await this.transfersService.validateRecipient(dto, lang);

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

  @Post('by-dni')
  @HttpCode(HttpStatus.OK)
  // ✅ PHASE 2: Add Idempotent decorator for retry safety
  @Idempotent()
  @ApiOperation({
    summary: '🔐 Enhanced P2P transfer using only recipient DNI',
    description: `
**PRIVATE ENDPOINT** - Execute P2P transfer using recipient's DNI number. System automatically finds recipient's wallet.

**Features:**
- Transfer using only recipient DNI
- Automatic wallet detection
- Built-in recipient validation
- Fee calculation and deduction
- Double-entry ledger recording
- Idempotent: Safe to retry with same Idempotency-Key header

**Use Cases:**
- Simple transfers without knowing wallet IDs
- Mobile app quick transfers
- User-friendly transfer interface
    `,
  })
  @ApiBody({ type: TransferByDniDto })
  @ApiResponse({
    status: 200,
    description: 'Transfer completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters or insufficient funds',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipient not found or wallet not available',
  })
  async transferByDni(
    @Body() dto: TransferByDniDto,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    try {
      // Override sender identifiers with current user
      dto.sender_user_id = currentUser.id;
      if (!dto.sender_wallet_id) {
        // Best effort: use the user's default LPS wallet if sender_wallet_id not provided
        const defaultCurrency = dto.currency || 'LPS';
        const wallet = await (Wallet as any).findOne({
          where: { user_id: currentUser.id, currency: defaultCurrency },
        });
        if (wallet) {
          dto.sender_wallet_id = wallet.id;
        }
      }

      const result = await this.transfersService.transferByDni(dto, lang);

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

  @Get(':id/confirmation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Get transfer confirmation details and status',
    description: `
**PRIVATE ENDPOINT** - Retrieve comprehensive confirmation details for a specific transfer.

**Features:**
- Complete transfer information
- Sender and receiver details
- Processing status and timestamps
- Fee breakdown
- Confirmation status

**Use Cases:**
- Display transfer receipt
- Confirm transfer completion
- Transaction verification
- Customer support queries
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Transfer/Transaction ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Transfer confirmation retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid transfer ID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Transfer not found or access denied',
  })
  async getTransferConfirmation(
    @Param('id') transferId: string,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    try {
      // Validate UUID format
      if (!this.isValidUUID(transferId)) {
        throw new BadRequestException(
          this.getTranslatedMessage('transfers.invalid_transfer_id', lang),
        );
      }

      const result = await this.transfersService.getTransferConfirmation(
        {
          transaction_id: transferId,
          user_id: currentUser.id,
        },
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

  @Post('p2p')
  @ApiOperation({ summary: 'Execute DNI-based P2P transfer with fixed fee' })
  @ApiOkResponse({ description: 'Returns safe transaction summary' })
  @ApiBody({ type: P2PTransferDto })
  async p2p(@Body() dto: P2PTransferDto) {
    return this.transfersService.p2pByDni(
      dto.sender_user_id,
      dto.sender_wallet_id,
      dto.receiver_user_id,
      dto.receiver_wallet_id,
      dto.amount,
      dto.description,
      dto.currency ?? 'LPS',
    );
  }
}
