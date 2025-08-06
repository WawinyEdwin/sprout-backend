import {
  ProcessedIntegrationData,
  RawIntegrationDataEvent,
  WorkspaceIntegration,
} from 'src/integrations/entities/integration.entity';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkspaceRoleEnum } from '../workspace.enum';

@Entity({ name: 'workspaces' })
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  industry: string;

  @OneToMany(() => WorkspaceMember, (member) => member.workspace)
  members: WorkspaceMember[];

  @OneToMany(() => RawIntegrationDataEvent, (def) => def.workspace)
  rawDataEvents: RawIntegrationDataEvent[];

  @OneToMany(() => ProcessedIntegrationData, (def) => def.metric)
  processedMetrics: ProcessedIntegrationData[];

  @OneToOne(() => Subscription, (subscription) => subscription.workspace)
  subscription: Subscription;

  @OneToMany(() => WorkspaceIntegration, (ui) => ui.workspace)
  integrations: WorkspaceIntegration[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity({ name: 'workspace_members' })
export class WorkspaceMember {
  @PrimaryColumn()
  userId: string;

  @PrimaryColumn()
  workspaceId: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.members)
  workspace: Workspace;

  @Column({ type: 'enum', enum: WorkspaceRoleEnum })
  role: WorkspaceRoleEnum;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
