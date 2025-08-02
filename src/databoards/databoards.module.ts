import { Module } from '@nestjs/common';
import { DataboardsService } from './databoards.service';
import { DataboardsController } from './databoards.controller';

@Module({
  controllers: [DataboardsController],
  providers: [DataboardsService],
})
export class DataboardsModule {}
