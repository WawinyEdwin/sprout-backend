import { Injectable } from '@nestjs/common';
import { CreateDataboardDto } from './dto/create-databoard.dto';
import { UpdateDataboardDto } from './dto/update-databoard.dto';

@Injectable()
export class DataboardsService {
  create(createDataboardDto: CreateDataboardDto) {
    return 'This action adds a new databoard';
  }

  findAll() {
    return `This action returns all databoards`;
  }

  findOne(id: number) {
    return `This action returns a #${id} databoard`;
  }

  update(id: number, updateDataboardDto: UpdateDataboardDto) {
    return `This action updates a #${id} databoard`;
  }

  remove(id: number) {
    return `This action removes a #${id} databoard`;
  }
}
