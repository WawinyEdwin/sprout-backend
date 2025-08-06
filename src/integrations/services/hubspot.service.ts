import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class HubspotService {
  private readonly logger = new Logger(HubspotService.name);
  constructor() {}
}
