import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { Repository } from 'typeorm';
import { IntegrationsService } from '../integrations/integrations.service';
import { SYSTEM_PROMPT } from './chat.prompts';
import { ChatMessage } from './entities/chat.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly openAIClient: OpenAI;

  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepo: Repository<ChatMessage>,
    private readonly integrationService: IntegrationsService,
    private readonly configService: ConfigService,
  ) {
    this.openAIClient = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async askQuestion(workspaceId: string, userId: string, question: string) {
    try {
      const recentData =
        await this.integrationService.findWorkspaceRawEventData(workspaceId);
      const contextData = recentData.map((r) => ({
        payload: r.rawPayload,
        data_source: r.integration.integration.key,
      }));

      const summarizedContext = contextData
        .map(
          (d) =>
            `Source: ${d.data_source}, Summary: ${this.summarizePayload(d.payload)}`,
        )
        .join('\n');

      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: SYSTEM_PROMPT.trim(),
        },
        {
          role: 'user',
          content: `Workspace Data:\n${summarizedContext}\n\nUser Question: ${question}`,
        },
      ];

      const model = contextData.length > 5 ? 'gpt-4' : 'gpt-3.5-turbo';

      const chatResponse = await this.openAIClient.chat.completions.create({
        model,
        messages,
      });

      const answer =
        chatResponse.choices[0]?.message?.content ?? 'No answer generated.';

      const saved = this.chatMessageRepo.create({
        question,
        answer,
        user: { id: userId },
        workspace: { id: workspaceId },
        relevantMetrics: contextData,
      });

      await this.chatMessageRepo.save(saved);

      return { answer };
    } catch (error) {
      this.logger.error('Error generating AI response');
      throw new InternalServerErrorException(
        `Failed to generate AI response: ${error.message}`,
      );
    }
  }

  private summarizePayload(payload: any): string {
    if (typeof payload !== 'object' || !payload) return String(payload);
    const summary = Object.entries(payload)
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? '[object]' : v}`)
      .join(', ');
    return summary;
  }
}
