import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

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

  @Column({ length: 200 })
  businessName: string;

  @Column({
    type: 'enum',
    enum: ServiceProviderType,
  })
  businessType: ServiceProviderType;

  @Column({ length: 100, nullable: true })
  registrationNumber: string; // BRELA registration number

  @Column({ length: 100, nullable: true })
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

  // Primary Contact Person
  @Column({ length: 200 })
  contactPersonName: string;

  @Column({ length: 15 })
  contactPersonPhone: string;

  @Column({ length: 100 })
  contactPersonEmail: string;

  @Column({ length: 100, nullable: true })
  contactPersonIdNumber: string; // NIDA number

  // Bank Account Details
  @Column({ length: 100, nullable: true })
  bankName: string;

  @Column({ length: 50, nullable: true })
  bankAccountNumber: string;

  @Column({ length: 100, nullable: true })
  bankAccountName: string;

  @Column({ length: 20, nullable: true })
  bankSwiftCode: string;

  // Settlement Configuration
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  commissionRate: number; // Percentage

  @Column({ type: 'varchar', length: 20, default: 'DAILY' })
  settlementFrequency: string; // DAILY, WEEKLY, MONTHLY

  @Column({ type: 'boolean', default: true })
  autoSettlement: boolean;

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

  @Column({ type: 'text', nullable: true })
  webhookUrl: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
