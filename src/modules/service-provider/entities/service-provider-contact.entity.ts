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

  @Column({ length: 100, nullable: true })
  idNumber: string; // NIDA number

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
