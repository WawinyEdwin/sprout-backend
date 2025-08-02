import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RequestWithUser } from 'src/auth/auth.types';
import { SupabaseAuthGuard } from 'src/supabase/supabase.guard';
import { IntegrationsService } from './integrations.service';
import { GoogleAnalyticsService } from './services/googleanalytics.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly googleAnalyticsService: GoogleAnalyticsService,
  ) {}

  @Get()
  @UseGuards(SupabaseAuthGuard)
  findAll() {
    return this.integrationsService.findAll();
  }

  @Get('/me')
  @UseGuards(SupabaseAuthGuard)
  async myIntegrations(@Req() req: RequestWithUser) {
    return this.integrationsService.myIntegrations(req.user.id);
  }

  @Get(':id')
  @UseGuards(SupabaseAuthGuard)
  findOne(@Param('id') id: string) {
    return this.integrationsService.findOne(+id);
  }

  @Get('ga/connect')
  @UseGuards(SupabaseAuthGuard)
  generateURL(@Req() req: RequestWithUser) {
    return this.googleAnalyticsService.generateAuthUrl(req.user.id);
  }

  @Get('ga/authorize/google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    console.log('callback in controller...')
    return await this.googleAnalyticsService.googleCallback(code, state);
  }

  @Get('ga/sync')
  @UseGuards(SupabaseAuthGuard)
  async syncData(
    @Body() payload: { userId: string; userIntegrationId: string },
  ) {
    return await this.googleAnalyticsService.syncData(
      payload.userId,
      payload.userIntegrationId,
    );
  }
}
