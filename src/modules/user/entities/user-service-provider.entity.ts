import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { ServiceProvider } from '../../service-provider/entities/service-provider.entity';

/**
 * Grants a SERVICE_PROVIDER user access to an additional service provider.
 *
 * A user's primary service provider is still resolved the legacy way
 * (SP email == user email, or user.createdBy == SP id). Rows here only add
 * extra service providers the same login can switch into.
 */
@Entity('user_service_providers')
@Unique('UQ_user_service_provider', ['userId', 'serviceProviderId'])
export class UserServiceProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index('IDX_user_service_providers_userId')
  userId: string;

  @Column({ type: 'uuid' })
  @Index('IDX_user_service_providers_serviceProviderId')
  serviceProviderId: string;

  // Role within this service provider. Null = use the user's own role.
  @Column({ type: 'varchar', length: 50, nullable: true })
  role: string | null;

  // Open this service provider on login instead of the primary one.
  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => ServiceProvider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceProviderId' })
  serviceProvider: ServiceProvider;
}
