import { Module } from '@nestjs/common';
import { DataPipelinesController } from './data-pipelines.controller';

@Module({
  controllers: [DataPipelinesController],
})
export class DataPipelinesModule {}
