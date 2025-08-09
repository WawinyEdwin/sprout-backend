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
import { SubscriptionPlanEnum } from '../subscription.enum';

@Entity({ name: 'subscriptions' })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPlanEnum,
    default: SubscriptionPlanEnum.FREE_TRIAL,
  })
  plan: SubscriptionPlanEnum;

  @Column({ nullable: true })
  stripeCustomerId: string;

  @Column({ nullable: true })
  stripeSubscriptionId: string;

  @Column({ type: 'timestamp', nullable: true })
  currentPeriodEnd: Date;

  @OneToOne(() => Workspace, (workspace) => workspace.subscription, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  workspace: Workspace;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
