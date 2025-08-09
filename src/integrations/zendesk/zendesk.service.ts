import { Injectable } from '@nestjs/common';

@Injectable()
export class ZendeskService {
  generateAuthUrl(workspaceId: string) {}
  async zendeskCallback(code: string, state: string) {}
}

// NOTE: Paid API
