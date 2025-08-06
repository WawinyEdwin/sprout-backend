import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ZendeskService {
  private readonly logger = new Logger(ZendeskService.name);
  constructor() {}
}
