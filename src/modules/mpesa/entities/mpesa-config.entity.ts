import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('mpesa_config')
export class MpesaConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  spId: string; // Business number (e.g., 400205)

  @Column({ type: 'varchar', length: 100 })
  spPassword: string; // Plain password for encryption

  @Column({ type: 'varchar', length: 50, nullable: true })
  initiator: string; // e.g., "ibm_in"

  @Column({ type: 'varchar', length: 100, nullable: true })
  initiatorPassword: string;

  @Column({ type: 'text', nullable: true })
  callbackUrl: string; // M-Pesa callback endpoint

  @Column({ type: 'text', nullable: true })
  validationUrl: string; // M-Pesa validation endpoint

  @Column({ type: 'varchar', length: 20, default: 'TZS' })
  currency: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
