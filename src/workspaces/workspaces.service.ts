import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { Workspace, WorkspaceMember } from './entities/workspace.entity';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepo: Repository<WorkspaceMember>,
  ) {}

  async findWorkspaceById(workspaceId: string): Promise<Workspace> {
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
      relations: ['subscription'],
    });

    if (!workspace) throw new NotFoundException('Workspace not found');

    return workspace;
  }

  async findWorkpaceByUserId(userId: string) {
    const member = await this.workspaceMemberRepo.findOne({
      where: {
        userId,
      },
      relations: ['workspace', 'workspace.subscription'],
    });
    if (!member) return null;

    return {
      ...member,
      workspace: {
        ...member.workspace,
        subscription: undefined,
      },
      subscription: member.workspace.subscription,
    };
  }

}
