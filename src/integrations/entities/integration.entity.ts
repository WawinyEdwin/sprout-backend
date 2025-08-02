import { User } from 'src/users/entities/users.entity';
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
@Unique('UQ_user_integration', ['user', 'integration'])
@Entity({ name: 'user_integrations' })
export class UserIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.userIntegrations, { nullable: false })
  user: User;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
