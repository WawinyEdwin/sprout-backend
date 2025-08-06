import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kpi } from './entities/kpi.entity';
import { KpiController } from './kpi.controller';
import { KpiService } from './kpi.service';

@Module({
  imports: [TypeOrmModule.forFeature([Kpi])],
  controllers: [KpiController],
  providers: [KpiService],
})
export class KpiModule {}
