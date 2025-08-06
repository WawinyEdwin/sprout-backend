import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  findOne(id: string): Promise<any> {
    const user = this.usersRepository.findOne({
      where: { id },
      relations: [
        'workspace_members',
        'workspace_members.workspace',
        'workspace_members.workspace.subscription',
        'workspace_members.workspace.integrations',
      ],
    });

    if (!user) {
      throw new NotFoundException('User info not found');
    }

    // Extract workspace (assuming single workspace)
    // const workspace = user.workspace_members?.[0]?.workspace;

    // Merge into response
    return {
      ...user,
    //   workspace: workspace
    //     ? {
    //         id: workspace.id,
    //         name: workspace.name,
    //         industry: workspace.industry,
    //         createdAt: workspace.createdAt,
    //         updatedAt: workspace.updatedAt,
    //       }
    //     : null,
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.usersRepository.update(id, {
      ...updateUserDto,
    });
  }
}
