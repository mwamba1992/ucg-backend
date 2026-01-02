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

export enum IdType {
  NIDA = 'NIDA',
  PASSPORT = 'PASSPORT',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  VOTER_ID = 'VOTER_ID',
}

@Entity('service_provider_contacts')
export class ServiceProviderContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  serviceProviderId: string;

  // Primary Contact Person
  @Column({ length: 200 })
  fullName: string;

  @Column({ length: 15 })
  phoneNumber: string;

  @Column({ length: 100 })
  email: string;

  @Column({
    type: 'enum',
    enum: IdType,
    default: IdType.NIDA,
  })
  idType: IdType;

  @Column({ length: 100, nullable: true })
  idNumber: string; // ID number based on idType

  @Column({ length: 100, nullable: true })
  position: string; // Job title/position

  @Column({ type: 'boolean', default: true })
  isPrimary: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationship
  @OneToOne(() => ServiceProvider, (sp) => sp.contact, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'serviceProviderId' })
  serviceProvider: ServiceProvider;
}
