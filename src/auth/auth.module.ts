import { Module } from '@nestjs/common';
import { UserModule } from '../users/users.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';

@Module({
  imports: [SupabaseModule, WorkspacesModule, UserModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
