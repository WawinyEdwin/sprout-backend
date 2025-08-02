import { UserIntegration } from 'src/integrations/entities/integration.entity';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

enum SubscriptionPlan {
  PROFESSIONAL = 'Professional',
  GROWTH = 'Growth',
  ENTERPRISE = 'Enterprise',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: true })
  agreedToTerms: boolean;

  @Column()
  completedOnboarding: boolean;

  @Column()
  companyName: string;

  @Column()
  companyIndustry: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => UserIntegration, (ui) => ui.user)
  userIntegrations: UserIntegration[];

  @OneToOne(() => Subscription, (subscription) => subscription.user)
  subscription: Subscription;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
