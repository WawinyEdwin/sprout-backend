import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailchimpService {
  private readonly logger = new Logger(MailchimpService.name);
  constructor() {}
}
