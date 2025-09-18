import { Controller, Get, VERSION_NEUTRAL, Res } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';
import { AppService } from './app.service';
import { ResponseService } from './common/services/response.service';

// Root controller (no versioning) - This will handle the root path
@Controller({ version: VERSION_NEUTRAL })
export class  AppController {
  @Get()
  @ApiExcludeEndpoint()
  getRoot() {
    return {
      message: 'Welcome to YaPague! Payment Management System API',
      version: 'v1',
      endpoints: {
        api: '/v1/',
        health: '/v1/health',
        docs: '/docs'
      }
    };
  }

  @Get('favicon.ico')
  @ApiExcludeEndpoint()
  getFavicon(@Res() res: Response) {
    res.status(204).end();
  }
}

