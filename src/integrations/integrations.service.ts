import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { UpdateWorkspaceIntegrationDto } from './dto/update-workspaceintegration.dto';
import {
  Integration,
  RawIntegrationDataEvent,
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
    @InjectRepository(RawIntegrationDataEvent)
    private rawEventRepo: Repository<RawIntegrationDataEvent>,
  ) {}

  async findOne(integrationId: string): Promise<Integration> {
    const integration = await this.integrationRepo.findOne({
      where: {
        id: integrationId,
      },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    return integration;
  }

  async saveRawIntegrationData(
    workspaceId: string,
    workspaceIntegrationId: string,
    payload: Record<string, any>,
    source: IntegrationType,
  ) {
    return await this.rawEventRepo.save({
      eventTimestamp: Date.now().toString(),
      integration: {
        id: workspaceIntegrationId,
      },
      processedAt: Date.now().toString(),
      source: source,
      rawPayload: payload,
      workspace: {
        id: workspaceId,
      },
    });
  }

  async findWorkspaceRawEventData(workspaceId: string) {
    return await this.rawEventRepo.find({
      where: { workspace: { id: workspaceId } },
      order: { eventTimestamp: 'DESC' },
      take: 50,
      relations: ['integration.integration'],
    });
  }

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
    const workspaceIntegration = await this.workspaceIntegrationRepo.findOne({
      where: {
        id: integrationId,
        workspace: {
          id: workspaceId,
        },
      },
    });

    if (!workspaceIntegration) {
      throw new NotFoundException('User does not have this integration');
    }

    return workspaceIntegration;
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

  async workspaceIntegrations(
    workspaceId: string,
  ): Promise<WorkspaceIntegration[]> {
    return await this.workspaceIntegrationRepo.find({
      where: {
        workspace: { id: workspaceId },
        connected: true,
      },
      relations: ['integration', 'integration.metrics'],
    });
  }
}
