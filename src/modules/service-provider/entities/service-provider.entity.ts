import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { ServiceProviderContact } from './service-provider-contact.entity';
import { ServiceProviderBankAccount } from './service-provider-bank-account.entity';
import { ServiceProviderSettings } from './service-provider-settings.entity';

export enum ServiceProviderType {
  SCHOOL = 'SCHOOL',
  HOSPITAL = 'HOSPITAL',
  CHURCH = 'CHURCH',
  SACCO = 'SACCO',
  MFI = 'MFI',
  NGO = 'NGO',
  UTILITY = 'UTILITY',
  GOVERNMENT = 'GOVERNMENT',
  OTHER = 'OTHER',
}

export enum OnboardingStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  KYC_VERIFICATION = 'KYC_VERIFICATION',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
  ACTIVE = 'ACTIVE',
}

@Entity('service_providers')
export class ServiceProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 3 })
  @Index()
  spCode: string; // XXX - 3 character unique code

  // Business Information
  @Column({ length: 200 })
  businessName: string;

  @Column({
    type: 'enum',
    enum: ServiceProviderType,
  })
  businessType: ServiceProviderType;

  @Column({ length: 100, unique: true })
  @Index()
  registrationNumber: string; // BRELA registration number

  @Column({ length: 100, unique: true })
  @Index()
  tinNumber: string; // TRA TIN number

  // Contact Information
  @Column({ length: 15 })
  phoneNumber: string;

  @Column({ length: 100, unique: true })
  @Index()
  email: string;

  @Column({ type: 'text', nullable: true })
  physicalAddress: string;

  @Column({ length: 100, nullable: true })
  region: string;

  @Column({ length: 100, nullable: true })
  district: string;

  // KYC Verification Status
  @Column({ type: 'boolean', default: false })
  nidaVerified: boolean;

  @Column({ type: 'boolean', default: false })
  brelaVerified: boolean;

  @Column({ type: 'boolean', default: false })
  traVerified: boolean;

  // Onboarding Status
  @Column({
    type: 'enum',
    enum: OnboardingStatus,
    default: OnboardingStatus.PENDING,
  })
  @Index()
  status: OnboardingStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string; // Admin user ID

  // API Configuration
  @Column({ length: 100, unique: true, nullable: true })
  apiKey: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  // Relationships
  @OneToOne(() => ServiceProviderContact, (contact) => contact.serviceProvider, {
    cascade: true,
    eager: true,
  })
  contact: ServiceProviderContact;

  @OneToMany(() => ServiceProviderBankAccount, (account) => account.serviceProvider, {
    cascade: true,
    eager: true,
  })
  bankAccounts: ServiceProviderBankAccount[];

  @OneToOne(() => ServiceProviderSettings, (settings) => settings.serviceProvider, {
    cascade: true,
    eager: true,
  })
  settings: ServiceProviderSettings;
}
