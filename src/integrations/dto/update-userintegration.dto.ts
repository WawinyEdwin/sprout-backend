import { PartialType } from '@nestjs/mapped-types';
import { CreateUserIntegrationDto } from './create-userintegration.dto';

export class UpdateUserIntegrationDto extends PartialType(
  CreateUserIntegrationDto,
) {}
