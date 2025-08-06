import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { KpiService } from './kpi.service';
import { CreateKpiDto } from './dto/create-kpi.dto';
import { UpdateKpiDto } from './dto/update-kpi.dto';

@Controller('kpi')
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Post()
  create(@Body() createKpiDto: CreateKpiDto) {
    return this.kpiService.create(createKpiDto);
  }

  @Get()
  findAll() {
    return this.kpiService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.kpiService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateKpiDto: UpdateKpiDto) {
    return this.kpiService.update(+id, updateKpiDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.kpiService.remove(+id);
  }
}
