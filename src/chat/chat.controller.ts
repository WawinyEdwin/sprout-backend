import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { RequestWithUser } from '../auth/auth.types';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('ask')
  @UseGuards(AuthGuard)
  async ask(
    @Body() dto: { question: string; workspaceId: string },
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.chatService.askQuestion(dto.workspaceId, userId, dto.question);
  }
}
