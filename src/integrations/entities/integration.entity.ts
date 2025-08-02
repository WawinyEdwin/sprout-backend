import { User } from 'src/users/entities/users.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IntegrationType } from '../integration.types';

enum AuthType {
  OAUTH = 'OAuth',
  API_KEY = 'API Key',
}

enum IntegrationCategory {
  BILLING = 'Billing',
  ADVERTISING = 'Advertising',
  CRM = 'CRM',
  FINANCE = 'Finance',
  DATABASE = 'Database',
  ECOMMERCE = 'E-commerce',
  ANALYTICS = 'Analytics',
  MARKETING = 'Marketing',
  CUSTOMER_SERVICE = 'Customer Service',
}

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

  @Column({ type: 'enum', enum: AuthType, default: 'API Key' })
  authType: string;

  @Column({ type: 'enum', enum: IntegrationCategory, default: 'CRM' })
  category: string;

  @OneToMany(() => Metric, (def) => def.integration)
  metrics: Metric[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity({ name: 'user_integrations' })
export class UserIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.userIntegrations)
  user: User;

  @ManyToOne(() => Integration)
  integration: Integration;

  @Column({ type: 'boolean', default: true })
  connected: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSynced?: Date;

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
