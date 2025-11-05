import { Controller, Get, Post, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatementsService } from './statements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../models/user.model';

@ApiTags('📋 Statements')
@Controller('private/user/statements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatementsController {
  constructor(private readonly statementsService: StatementsService) {}

  /**
   * GET /v1/private/user/statements/history - Get user's transaction statement history
   */
  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get user's transaction statement history" })
  async getHistory(@GetUser() user: User) {
    return this.statementsService.getStatementHistory(user.id);
  }

  /**
   * POST /v1/private/user/statements/export - Export statement to CSV or PDF
   */
  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export statement to CSV or PDF' })
  async exportStatement(
    @Body() body: { period: string; format?: 'csv' | 'pdf' | 'json' },
    @GetUser() user: User,
  ) {
    const format = body.format || 'json';
    
    if (format === 'csv') {
      const csv = await this.statementsService.exportStatementAsCSV(user.id, body.period);
      return { format: 'csv', content: csv };
    } else if (format === 'pdf') {
      return { format: 'pdf', message: 'PDF export not yet implemented', period: body.period };
    } else {
      return this.statementsService.exportStatementAsJSON(user.id, body.period);
    }
  }

  // Legacy routes for backwards compatibility - MUST come before :id route
  @Get(':period/export-csv')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export statement as CSV (legacy)' })
  async exportCSV(
    @Param('period') period: string,
    @GetUser() user: User,
  ) {
    const csv = await this.statementsService.exportStatementAsCSV(user.id, period);
    return { format: 'csv', content: csv };
  }

  @Get(':period/export-json')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export statement as JSON (legacy)' })
  async exportJSON(
    @Param('period') period: string,
    @GetUser() user: User,
  ) {
    return this.statementsService.exportStatementAsJSON(user.id, period);
  }

  /**
   * GET /v1/private/user/statements/:id - Get detailed statement by ID
   * MUST come after all specific routes to avoid conflicts
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get detailed statement by ID' })
  async getStatement(
    @Param('id') id: string,
    @GetUser() user: User,
  ) {
    // Support both ID and period format for backwards compatibility
    return this.statementsService.getStatement(user.id, id);
  }
}
