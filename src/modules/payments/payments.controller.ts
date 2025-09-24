import { Body, Controller, Post, Get, Param, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiBody, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto';
import { RedeemPaymentDto } from './dto/redeem-payment.dto';
import {
  GenerateQrDto,
  GetPaymentCodeDto,
  SharePaymentDto,
  ScanQrDto,
  RedeemByCodeDto,
  ValidateCodeDto
} from './dto/payment-qr.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Lang } from '../../common/decorators/lang.decorator';
import { User } from '../../models/user.model';
import { ResponseService } from '../../common/services/response.service';
import { StatusCode } from '../../common/constants/status-codes';

@ApiTags('🔐 Payments')
@Controller('private/payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly responseService: ResponseService,
  ) {}

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  @Post('request')
  @ApiOperation({ summary: '🔐 Create a QR/code payment request (expires in ~10 minutes)' })
  @ApiOkResponse({ description: 'Returns code, qr_id and expiry; safe response' })
  @ApiBody({ type: CreatePaymentRequestDto })
  async request(@Body() dto: CreatePaymentRequestDto, @GetUser() currentUser: User) {
    // Override user_id with current user from JWT
    dto.user_id = currentUser.id;
    return this.paymentsService.createPaymentRequest(dto.user_id, dto.wallet_id, dto.amount, dto.currency ?? 'LPS');
  }

  @Post('redeem')
  @ApiOperation({ summary: '🔐 Redeem a QR/code payment and transfer between wallets' })
  @ApiOkResponse({ description: 'Returns safe transaction summary' })
  @ApiBody({ type: RedeemPaymentDto })
  async redeem(@Body() dto: RedeemPaymentDto, @GetUser() currentUser: User) {
    // Override receiver_user_id with current user from JWT
    dto.receiver_user_id = currentUser.id;
    return this.paymentsService.redeemPayment(dto.qr_id, dto.receiver_user_id, dto.receiver_wallet_id);
  }

  @Post('generate-qr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Generate payment QR code with specific amount and description',
    description: `
**PRIVATE ENDPOINT** - Generate a payment QR code for receiving payments.

**Features:**
- Generate QR code with specific amount
- Create shareable payment code
- Set payment description/note
- Automatic expiration (10 minutes)
- Support for multiple currencies

**Use Cases:**
- Merchant payment requests
- P2P payment collection
- Invoice generation
- Quick payment links
    `,
  })
  @ApiBody({ type: GenerateQrDto })
  @ApiResponse({
    status: 200,
    description: 'QR code generated successfully',
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
    description: 'User or wallet not found',
  })
  async generateQr(
    @Body() dto: GenerateQrDto,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    try {
      // Override user_id with current user
      dto.user_id = currentUser.id;

      const result = await this.paymentsService.generateQr(dto, lang);

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

  @Get('code/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Get payment code details and validation status',
    description: `
**PRIVATE ENDPOINT** - Retrieve details for a specific payment code.

**Features:**
- Get payment amount and description
- Check code validity and expiration
- Get sender information
- Verify code status

**Use Cases:**
- Validate code before payment
- Display payment details to user
- Check code expiration
- Get sender information
    `,
  })
  @ApiParam({
    name: 'code',
    description: 'Payment code (e.g., ABCD-1234)',
    example: 'ABCD-1234',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment code details retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid code format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment code not found',
  })
  async getPaymentCodeDetails(
    @Param('code') code: string,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    try {
      // Validate code format
      if (!/^[A-Z0-9-]+$/.test(code) || code.length < 8 || code.length > 20) {
        throw new BadRequestException('Invalid payment code format');
      }

      const result = await this.paymentsService.getPaymentCodeDetails(
        {
          code,
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

  @Post('share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Generate shareable payment link/code for social sharing',
    description: `
**PRIVATE ENDPOINT** - Generate shareable content for payment requests.

**Features:**
- Create shareable links
- Generate WhatsApp messages
- Create SMS content
- Generate email content
- Include QR code data

**Use Cases:**
- Share payment requests via social media
- Send payment links via messaging
- Create email payment requests
- Generate QR codes for printing
    `,
  })
  @ApiBody({ type: SharePaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Shareable content generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters or inactive payment',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment request not found',
  })
  async sharePayment(
    @Body() dto: SharePaymentDto,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    try {
      // Override user_id with current user
      dto.user_id = currentUser.id;

      const result = await this.paymentsService.sharePayment(dto, lang);

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

  @Post('scan-qr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Process payment by scanning QR code (validate and execute)',
    description: `
**PRIVATE ENDPOINT** - Scan and process payment QR codes.

**Features:**
- Parse QR code data
- Validate payment code
- Execute payment transaction
- Handle both QR data and manual codes
- Automatic wallet detection

**Use Cases:**
- Mobile QR code scanning
- Quick payment processing
- Contactless payments
- Manual code entry fallback
    `,
  })
  @ApiBody({ type: ScanQrDto })
  @ApiResponse({
    status: 200,
    description: 'Payment processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid QR data or insufficient funds',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment code not found or expired',
  })
  async scanQr(
    @Body() dto: ScanQrDto,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    try {
      // Override scanner_user_id with current user
      dto.scanner_user_id = currentUser.id;

      const result = await this.paymentsService.scanQr(dto, lang);

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

  @Post('redeem-by-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Process payment using manually entered code',
    description: `
**PRIVATE ENDPOINT** - Process payment using manually entered payment code.

**Features:**
- Manual code entry processing
- Code validation and verification
- Execute payment transaction
- Handle expired/used codes
- Automatic balance updates

**Use Cases:**
- Manual payment code entry
- Fallback for QR scanning issues
- Phone-based payments
- Customer service assistance
    `,
  })
  @ApiBody({ type: RedeemByCodeDto })
  @ApiResponse({
    status: 200,
    description: 'Payment processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid code or insufficient funds',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment code not found or expired',
  })
  async redeemByCode(
    @Body() dto: RedeemByCodeDto,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    try {
      // Override receiver_user_id with current user
      dto.receiver_user_id = currentUser.id;

      const result = await this.paymentsService.redeemByCode(dto, lang);

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

  @Post('validate-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Validate payment code before processing (check expiry, amount, etc.)',
    description: `
**PRIVATE ENDPOINT** - Validate payment code without processing the payment.

**Features:**
- Check code validity
- Verify expiration status
- Get payment details
- Check sender information
- Validate code format

**Use Cases:**
- Pre-validate before payment
- Display payment preview
- Check code status
- Prevent invalid payment attempts
    `,
  })
  @ApiBody({ type: ValidateCodeDto })
  @ApiResponse({
    status: 200,
    description: 'Code validation completed',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid code format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async validateCode(
    @Body() dto: ValidateCodeDto,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    try {
      // Override user_id with current user
      dto.user_id = currentUser.id;

      const result = await this.paymentsService.validateCode(dto, lang);

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
