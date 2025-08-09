import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMessage } from './entities/chat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    IntegrationsModule,
    SupabaseModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
