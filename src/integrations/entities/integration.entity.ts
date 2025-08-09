import { Workspace } from 'src/workspaces/entities/workspace.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import {
  AuthTypeEnum,
  DataSyncFrequencyEnum,
  HistoricalDataEnum,
  IntegrationCategoryEnum,
} from '../integration.enum';
import { IntegrationType } from '../integration.types';

@Entity({ name: 'integrations' })
export class Integration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  key: IntegrationType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: AuthTypeEnum, default: 'API Key' })
  authType: string;

  @Column({ type: 'enum', enum: IntegrationCategoryEnum, default: 'CRM' })
  category: string;

  @OneToMany(() => Metric, (def) => def.integration)
  metrics: Metric[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
@Unique('UQ_workspace_integration', ['workspace', 'integration'])
@Entity({ name: 'workspace_integrations' })
export class WorkspaceIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.integrations, {
    nullable: false,
  })
  workspace: Workspace;

  @ManyToOne(() => Integration, { nullable: false })
  integration: Integration;

  @Column({ type: 'boolean', default: true })
  connected: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSynced?: Date;

  @Column({
    type: 'enum',
    enum: DataSyncFrequencyEnum,
    default: DataSyncFrequencyEnum.DAILY,
  })
  syncFrequency: DataSyncFrequencyEnum;

  @Column({
    type: 'enum',
    enum: HistoricalDataEnum,
    default: HistoricalDataEnum.ALL_AVAILABLE_DATA,
  })
  historicalData: HistoricalDataEnum;

  @Column({ type: 'jsonb', nullable: true })
  authData?: Record<string, any>; // token, refreshToken

  @OneToMany(() => RawIntegrationDataEvent, (def) => def.workspace)
  rawDataEvents: RawIntegrationDataEvent[];

  @OneToMany(() => ProcessedIntegrationData, (def) => def.workspace)
  processedMetrics: ProcessedIntegrationData[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity({ name: 'metrics' })
export class Metric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  key: string;

  @Column()
  name: string;

  @ManyToOne(() => Integration, (integration) => integration.metrics)
  integration: Integration;

  @OneToMany(() => RawIntegrationDataEvent, (def) => def.metric)
  rawDataEvents: RawIntegrationDataEvent[];

  @OneToMany(() => ProcessedIntegrationData, (def) => def.metric)
  processedMetrics: ProcessedIntegrationData[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity({ name: 'raw_data_events' })
export class RawIntegrationDataEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.rawDataEvents)
  workspace: Workspace;

  @ManyToOne(
    () => WorkspaceIntegration,
    (integration) => integration.rawDataEvents,
  )
  integration: WorkspaceIntegration;

  @ManyToOne(() => Metric, (metric) => metric.rawDataEvents)
  metric: Metric;

  @Column()
  source: string;

  @Column({ type: 'jsonb' })
  rawPayload: Record<string, any>;

  @Column()
  processedAt: Date;

  @Column()
  eventTimestamp: Date;
}

@Entity({ name: 'processed_metrics' })
export class ProcessedIntegrationData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.processedMetrics)
  workspace: Workspace;

  @ManyToOne(
    () => WorkspaceIntegration,
    (integration) => integration.processedMetrics,
  )
  integration: WorkspaceIntegration;

  @ManyToOne(() => Metric, (metric) => metric.processedMetrics)
  metric: Metric;

  @Column({ type: 'jsonb' })
  dimensions: Record<string, any>;

  @Column()
  processedAt: Date;

  @Column()
  eventTimestamp: Date;
}

@Entity({ name: 'integration_request' })
export class IntegrationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.integrations, {
    nullable: false,
  })
  workspace: Workspace;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
