import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkspaceIntegrationDto } from './create-workspaceintegration.dto';

export class UpdateWorkspaceIntegrationDto extends PartialType(
  CreateWorkspaceIntegrationDto,
) {}
