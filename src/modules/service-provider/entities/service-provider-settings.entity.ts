import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceProvider } from './service-provider.entity';

export enum SettlementFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  ON_DEMAND = 'ON_DEMAND',
}

@Entity('service_provider_settings')
export class ServiceProviderSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  serviceProviderId: string;

  // Settlement Configuration
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  commissionRate: number; // Percentage (e.g., 2.50 for 2.5%)

  @Column({
    type: 'enum',
    enum: SettlementFrequency,
    default: SettlementFrequency.DAILY,
  })
  settlementFrequency: SettlementFrequency;

  @Column({ type: 'boolean', default: true })
  autoSettlement: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  minimumSettlementAmount: number; // Minimum amount before settlement

  // Webhook Configuration
  @Column({ type: 'text', nullable: true })
  webhookUrl: string;

  @Column({ type: 'boolean', default: false })
  webhookEnabled: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  webhookSecret: string; // For signature verification

  // Notification Settings
  @Column({ type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  smsNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  pushNotifications: boolean;

  // Transaction Limits
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  dailyTransactionLimit: number;

  @Column({ type: 'int', nullable: true })
  dailyTransactionCount: number;

  // API Settings
  @Column({ type: 'int', default: 100 })
  apiRateLimit: number; // Requests per minute

  @Column({ type: 'boolean', default: true })
  apiEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationship
  @OneToOne(() => ServiceProvider, (sp) => sp.settings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'serviceProviderId' })
  serviceProvider: ServiceProvider;
  transactionFee: number;
}
