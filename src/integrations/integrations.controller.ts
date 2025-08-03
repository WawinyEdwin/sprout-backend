import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { RequestWithUser } from 'src/auth/auth.types';
import { SupabaseAuthGuard } from 'src/supabase/supabase.guard';
import { UpdateUserIntegrationDto } from './dto/update-userintegration.dto';
import { IntegrationsService } from './integrations.service';
import { GoogleAdsService } from './services/googleads.service';
import { GoogleAnalyticsService } from './services/googleanalytics.service';
import { FacebookAdsService } from './services/facebookads.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly googleAnalyticsService: GoogleAnalyticsService,
    private readonly googleAdsService: GoogleAdsService,
    private readonly facebookAdsService: FacebookAdsService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(SupabaseAuthGuard)
  findAll() {
    return this.integrationsService.findAll();
  }

  @Get('user')
  @UseGuards(SupabaseAuthGuard)
  async userIntegrations(@Req() req: RequestWithUser) {
    return this.integrationsService.userIntegrations(req.user.id);
  }

  @Patch('user/:integrationId')
  @UseGuards(SupabaseAuthGuard)
  async updateUserIntegration(
    @Param('integrationId') integrationId: string,
    @Body() updateUserIntegrationDto: UpdateUserIntegrationDto,
  ) {
    return await this.integrationsService.updateUserIntegration(
      integrationId,
      updateUserIntegrationDto,
    );
  }

  @Get('ga/connect')
  @UseGuards(SupabaseAuthGuard)
  generateURL(@Req() req: RequestWithUser) {
    return this.googleAnalyticsService.generateAuthUrl(req.user.id);
  }

  @Get('ga/authorize/google/callback')
  async googleAnalyticsCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    try {
      await this.googleAnalyticsService.googleCallback(code, state);
      res.redirect(`${frontendUrl}/dashboard/sources?connect=success`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${frontendUrl}/dashboard/sources?connect=error`);
    }
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

  @Get('google-ads/connect')
  @UseGuards(SupabaseAuthGuard)
  generateAdsURL(@Req() req: RequestWithUser) {
    return this.googleAdsService.generateAuthUrl(req.user.id);
  }

  @Get('google-ads/authorize/google/callback')
  async googleAdsCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    try {
      await this.googleAdsService.googleCallback(code, state);
      res.redirect(`${frontendUrl}/dashboard/sources?connect=success`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${frontendUrl}/dashboard/sources?connect=error`);
    }
  }

  @Get('facebook-ads/connect')
  @UseGuards(SupabaseAuthGuard)
  generatefbURL(@Req() req: RequestWithUser) {
    return this.facebookAdsService.generateAuthUrl(req.user.id);
  }

  @Get('facebook-ads/authorize/fb/callback')
  async facebookAdsCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    try {
      await this.facebookAdsService.facebookCallback(code, state);
      res.redirect(`${frontendUrl}/dashboard/sources?connect=success`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${frontendUrl}/dashboard/sources?connect=error`);
    }
  }
}
