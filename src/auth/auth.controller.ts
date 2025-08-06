import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AuthService } from './auth.service';
import { RequestWithUser } from './auth.types';
import { AuthDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly workspaceService: WorkspacesService,
  ) {}

  @Get('logout')
  async logout() {
    return await this.authService.logout();
  }

  @Post('resend')
  async resendEmailConfirmation(@Body() payload: Partial<AuthDto>) {
    return await this.authService.resendEmailConfirmation(payload.email!);
  }

  @Post('login')
  async login(@Body() payload: AuthDto, res: Response) {
    const loginResponse = await this.authService.loginWithEmailAndPassword(
      payload.email,
      payload.password,
    );
    const workpaceInfo = await this.workspaceService.findWorkpaceByUserId(
      loginResponse.user.id,
    );

    return {
      access_token: loginResponse.session.access_token,
      user_metadata: loginResponse.user.user_metadata,
      workspace: workpaceInfo,
    };
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
  @UseGuards(AuthGuard)
  async getUserStatus(@Req() req: RequestWithUser) {
    const user = req.user;
    return {
      email: user.email,
      email_verified: user.email_confirmed_at !== null,
    };
  }
}
