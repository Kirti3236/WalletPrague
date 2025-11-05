import { Controller, Post, Get, Put, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RestrictionsService } from './restrictions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../models/user.model';
import { RestrictionType } from '../../models/restriction.model';

@ApiTags('🔒 Restrictions')
@Controller('private/admin/restrictions')
@UseGuards(JwtAuthGuard)
export class RestrictionsController {
  constructor(private readonly restrictionsService: RestrictionsService) {}

  @Post(':userId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create restriction for user' })
  async createRestriction(
    @Param('userId') userId: string,
    @Body() body: any,
    @GetUser() admin: User,
  ) {
    return this.restrictionsService.createRestriction(
      userId,
      body.type,
      body.value,
      admin.id,
      body.description,
      body.latitude,
      body.longitude,
      body.radius_km,
    );
  }

  @Get(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List user restrictions' })
  async listRestrictions(@Param('userId') userId: string) {
    return this.restrictionsService.listRestrictions(userId);
  }

  @Put(':restrictionId/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle restriction active status' })
  async toggleRestriction(
    @Param('restrictionId') restrictionId: string,
    @Body() body: { is_active: boolean },
  ) {
    return this.restrictionsService.toggleRestriction(restrictionId, body.is_active);
  }
}
