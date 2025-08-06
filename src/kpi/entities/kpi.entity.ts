import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'kpi_rules' })
export class Kpi {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspace_id: string;

  metric_id: string;

  name: string;

  time_period: string;

  @Column()
  condition: string;

  @Column()
  threshold: number;

  @Column({ type: 'boolean' })
  isEnabled: boolean;

  @Column()
  lastCheckedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
