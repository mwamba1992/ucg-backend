import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ServiceProvider } from './service-provider.entity';

@Entity('service_provider_bank_accounts')
export class ServiceProviderBankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  serviceProviderId: string;

  @Column({ length: 100 })
  bankName: string;

  @Column({ length: 50 })
  accountNumber: string;

  @Column({ length: 100 })
  accountName: string;

  @Column({ length: 20, nullable: true })
  swiftCode: string;

  @Column({ length: 100, nullable: true })
  branchName: string;

  @Column({ length: 100, nullable: true })
  branchCode: string;

  @Column({ type: 'varchar', length: 20, default: 'SAVINGS' })
  accountType: string; // SAVINGS, CURRENT, etc.

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean; // Primary account for settlements

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationship
  @ManyToOne(() => ServiceProvider, (sp) => sp.bankAccounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'serviceProviderId' })
  serviceProvider: ServiceProvider;
}
