import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Session,
  SupabaseClient,
  User,
  WeakPassword,
} from '@supabase/supabase-js';
import { UsersService } from '../users/users.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly userService: UsersService,
  ) {
    this.supabase = this.supabaseService.createSupabaseClient();
    this.supabaseAdmin = this.supabaseService.createSupabaseAdminClient();
  }

  async resetPassword(password: string, email: string) {
    const user = await this.userService.findOneByEmail(email);
    const userId = user.id;
    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password },
    );

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Password reset successful!' };
  }

  async forgotPassword(email: string, redirectTo: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Password updated successfully' };
  }

  async resendEmailConfirmation(email: string) {
    const { error } = await this.supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async loginWithEmailAndPassword(
    email: string,
    password: string,
  ): Promise<{
    user: User;
    session: Session;
    weakPassword?: WeakPassword;
  }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async signupWithEmailAndPassword(
    email: string,
    password: string,
    userMetadata?: Record<string, any>,
  ): Promise<{
    user: User | null;
    session: Session | null;
  }> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...userMetadata,
        },
        emailRedirectTo: process.env.EMAIL_REDIRECT,
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async logout(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new BadRequestException(error.message);
    }
  }
}
