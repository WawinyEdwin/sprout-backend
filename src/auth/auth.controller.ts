import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { SupabaseAuthGuard } from 'src/supabase/supabase.guard';
import { AuthService } from './auth.service';
import { RequestWithUser } from './auth.types';
import { AuthDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('logout')
  async logout() {
    return await this.authService.logout();
  }

  @Post('resend')
  async resendEmailConfirmation(@Body() payload: Partial<AuthDto>) {
    return await this.authService.resendEmailConfirmation(payload.email!);
  }

  @Post('login')
  async login(@Body() payload: AuthDto) {
    return await this.authService.loginWithEmailAndPassword(
      payload.email,
      payload.password,
    );
  }

  @Post('signup')
  async signup(@Body() payload: AuthDto) {
    return await this.authService.signupWithEmailAndPassword(
      payload.email,
      payload.password,
      payload.userMetadata,
    );
  }

  @Get('status')
  @UseGuards(SupabaseAuthGuard)
  async getUserStatus(@Req() req: RequestWithUser) {
    const user = req.user;
    return {
      email: user.email,
      email_verified: user.email_confirmed_at !== null,
    };
  }
}
