import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DataboardsService } from './databoards.service';
import { CreateDataboardDto } from './dto/create-databoard.dto';
import { UpdateDataboardDto } from './dto/update-databoard.dto';

@Controller('databoards')
export class DataboardsController {
  constructor(private readonly databoardsService: DataboardsService) {}

  @Post()
  create(@Body() createDataboardDto: CreateDataboardDto) {
    return this.databoardsService.create(createDataboardDto);
  }

  @Get()
  findAll() {
    return this.databoardsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.databoardsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDataboardDto: UpdateDataboardDto) {
    return this.databoardsService.update(+id, updateDataboardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.databoardsService.remove(+id);
  }
}
