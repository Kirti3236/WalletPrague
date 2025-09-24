import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PaymentMethodsService } from './payment-methods.service';
import { AddBankAccountDto, AddCardDto } from './dto/payment-methods.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../models/user.model';

// DTOs moved to ./dto with Swagger metadata

@ApiTags('🔐 Payment Methods')
@Controller('private/payment-methods')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentMethodsController {
  constructor(private readonly service: PaymentMethodsService) {}

  @Post('cards')
  @ApiOperation({ summary: 'Add a static card (mock, no PAN/CVV stored)' })
  @ApiBody({ type: AddCardDto })
  async addCard(@Body() dto: AddCardDto, @GetUser() currentUser: User) {
    // Always override user_id from JWT to avoid client-side spoofing
    dto.user_id = currentUser.id;
    return this.service.addStaticCard(dto as any);
  }

  @Post('bank-accounts')
  @ApiOperation({ summary: 'Add a bank account (mock, no real account details stored)' })
  @ApiBody({ type: AddBankAccountDto })
  async addBankAccount(@Body() dto: AddBankAccountDto, @GetUser() currentUser: User) {
    // Always override user_id from JWT to avoid client-side spoofing
    dto.user_id = currentUser.id;
    return this.service.addBankAccount(dto as any);
  }

  @Get('cards/:user_id')
  @ApiOperation({ summary: 'List user cards (static)' })
  @ApiParam({ name: 'user_id', description: 'User ID (UUID)' })
  async listCards(@Param('user_id') userId: string) {
    return this.service.listUserCards(userId);
  }

  @Delete('cards/:user_id/:id')
  @ApiOperation({ summary: 'Delete a card (soft deactivate)' })
  @ApiParam({ name: 'user_id' })
  @ApiParam({ name: 'id' })
  async deleteCard(@Param('user_id') userId: string, @Param('id') id: string) {
    return this.service.deleteCard(userId, id);
  }
}


