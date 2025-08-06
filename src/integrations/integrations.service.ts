import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { UpdateWorkspaceIntegrationDto } from './dto/update-workspaceintegration.dto';
import {
  Integration,
  WorkspaceIntegration,
} from './entities/integration.entity';
import { IntegrationType, IOAuthInfo } from './integration.types';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  constructor(
    @InjectRepository(Integration)
    private integrationRepo: Repository<Integration>,
    @InjectRepository(WorkspaceIntegration)
    private workspaceIntegrationRepo: Repository<WorkspaceIntegration>,
  ) {}

  async disconnectIntegration(workspaceIntegrationId: string) {
    return await this.workspaceIntegrationRepo.update(workspaceIntegrationId, {
      connected: false,
    });
  }

  async updateOAuthTokens(
    WorkspaceIntegrationId: string,
    oauthData: Partial<IOAuthInfo>,
  ) {
    return await this.workspaceIntegrationRepo.update(WorkspaceIntegrationId, {
      authData: oauthData as DeepPartial<Record<string, any>>,
    });
  }

  async findWorkspaceIntegrationByWorkspaceId(
    workspaceId: string,
    integrationId: string,
  ): Promise<WorkspaceIntegration> {
    const WorkspaceIntegration = await this.workspaceIntegrationRepo.findOne({
      where: {
        id: integrationId,
        workspace: {
          id: workspaceId,
        },
      },
    });

    if (!WorkspaceIntegration) {
      throw new NotFoundException('User does not have this integration');
    }

    return WorkspaceIntegration;
  }

  async updateWorkspaceIntegration(
    integrationId: string,
    updateWorkspaceIntegrationDto: UpdateWorkspaceIntegrationDto,
  ) {
    return await this.workspaceIntegrationRepo.update(integrationId, {
      ...updateWorkspaceIntegrationDto,
    });
  }

  async saveOAuthIntegration(
    workspaceId: string,
    integration: IntegrationType,
    OauthInfo: Partial<IOAuthInfo>,
  ): Promise<WorkspaceIntegration> {
    this.logger.log(
      `Saving auth info for ${integration} in workspaceId: ${workspaceId}`,
    );
    const ga = await this.integrationRepo.findOne({
      where: {
        key: integration,
      },
    });

    if (!ga) {
      this.logger.warn('Failed to get the intergation');
    }
    const connection = this.workspaceIntegrationRepo.create({
      workspace: { id: workspaceId },
      authData: OauthInfo,
      integration: { id: ga?.id },
    });
    return await this.workspaceIntegrationRepo.save(connection);
  }

  findAll() {
    return this.integrationRepo.find({
      relations: ['metrics'],
    });
  }

  async WorkspaceIntegrations(userId: string): Promise<WorkspaceIntegration[]> {
    return await this.workspaceIntegrationRepo.find({
      where: {
        // workspace: { id: workspaceId },
        connected: true,
      },
      relations: ['integration', 'integration.metrics'],
    });
  }

  async getIntegrationAuthDataByUserId(
    userId: string,
    WorkspaceIntegrationId: string,
  ): Promise<WorkspaceIntegration> {
    const data = await this.workspaceIntegrationRepo.findOne({
      where: {
        // workspace: { id: workspaceId },
        id: WorkspaceIntegrationId,
      },
    });
    if (!data) {
      throw new NotFoundException('Intergration does not exits');
    }
    return data;
  }

  findOne(id: number) {
    return `This action returns a #${id} integration`;
  }
}
