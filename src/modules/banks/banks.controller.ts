import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BanksService } from './banks.service';

@ApiTags('banks')
@Controller('banks')
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Get('nearby')
  @ApiOperation({ summary: 'List nearby/active bank locations for deposits' })
  @ApiOkResponse({ description: 'Safe list of bank branches' })
  async nearby(@Query('limit') limit = 20) {
    return this.banksService.listNearby(Number(limit));
  }
}
