import { Workspace } from 'src/workspaces/entities/workspace.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SubscriptionPlan {
  PROFESSIONAL = 'Professional',
  GROWTH = 'Growth',
  ENTERPRISE = 'Enterprise',
  FREE_TRIAL = 'Free Trial',
}

@Entity({ name: 'subscriptions' })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: SubscriptionPlan, default: 'Free Trial' })
  plan: SubscriptionPlan;

  @Column({ nullable: true })
  stripeCustomerId: string;

  @Column({ nullable: true })
  stripeSubscriptionId: string;

  @Column({ type: 'timestamp', nullable: true })
  currentPeriodEnd: Date;

  @OneToOne(() => Workspace, (workspace) => workspace.subscription, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  workspace: Workspace;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
