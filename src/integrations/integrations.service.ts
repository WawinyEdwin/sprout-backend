import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async connectGoogleAnalytics(
    userId: string,
    integration: IntegrationType,
    OauthInfo: IOAuthInfo,
  ) {
    this.userIntegrationRepository.create({
      user: { id: userId },
      authData: OauthInfo,
      integration: { key: integration },
    });
  }

  findAll() {
    return this.integrationRepository.find({
      relations:['metrics']
    });
  }

  async myIntegrations(userId: string): Promise<Integration[]> {
    const userIntegrations = await this.userIntegrationRepository.find({
      where: { user: { id: userId } },
      relations: ['integration'],
    });
    return userIntegrations.map((ui) => ui.integration);
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
