import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateUserIntegrationDto } from './dto/update-userintegration.dto';
import { Integration, UserIntegration } from './entities/integration.entity';
import { IntegrationType } from './integration.types';

interface IOAuthInfo {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Integration)
    private integrationRepository: Repository<Integration>,
    @InjectRepository(UserIntegration)
    private userIntegrationRepository: Repository<UserIntegration>,
  ) {}

  async updateUserIntegration(
    integrationId: string,
    updateUserIntegrationDto: UpdateUserIntegrationDto,
  ) {
    return await this.userIntegrationRepository.update(integrationId, {
      ...updateUserIntegrationDto,
    });
  }

  async connectGoogle(
    userId: string,
    integration: IntegrationType,
    OauthInfo: IOAuthInfo,
  ): Promise<UserIntegration> {
    const ga = await this.integrationRepository.findOne({
      where: {
        key: integration,
      },
    });

    if (!ga) {
      Logger.warn('Failed to get the intergation');
    }
    const connection = this.userIntegrationRepository.create({
      user: { id: userId },
      authData: OauthInfo,
      integration: { id: ga?.id },
    });
    return await this.userIntegrationRepository.save(connection);
  }


  findAll() {
    return this.integrationRepository.find({
      relations: ['metrics'],
    });
  }

  async userIntegrations(userId: string): Promise<UserIntegration[]> {
    return await this.userIntegrationRepository.find({
      where: { user: { id: userId } },
      relations: ['integration', 'integration.metrics'],
    });
  }

  async getIntegrationAuthDataByUserId(
    userId: string,
    userIntegrationId: string,
  ): Promise<UserIntegration> {
    const data = await this.userIntegrationRepository.findOne({
      where: {
        user: { id: userId },
        id: userIntegrationId,
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
