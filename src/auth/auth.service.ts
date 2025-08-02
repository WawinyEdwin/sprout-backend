import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Session,
  SupabaseClient,
  User,
  WeakPassword,
} from '@supabase/supabase-js';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(private readonly supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.createSupabaseClient();
  }

  async resendEmailConfirmation(email: string) {
    const { error } = await this.supabase.auth.resend({
      type: 'signup',
      email: email,
      // options: {
      //   emailRedirectTo: 'https://example.com/welcome',
      // },
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
        emailRedirectTo:
          process.env.EMAIL_REDIRECT ?? 'http://localhost:3000/auth/signin?redirect=/onboarding',
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
