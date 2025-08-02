import { PartialType } from '@nestjs/mapped-types';
import { CreateDataboardDto } from './create-databoard.dto';

export class UpdateDataboardDto extends PartialType(CreateDataboardDto) {}
