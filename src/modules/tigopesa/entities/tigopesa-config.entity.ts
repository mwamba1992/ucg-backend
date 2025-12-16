import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tigopesa_config')
export class TigoPesaConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  companyName: string; // Partner company identifier (e.g., "12345")

  @Column({ type: 'varchar', length: 255, nullable: true })
  webhookUrl: string; // TigoPesa webhook endpoint (for receiving notifications)

  @Column({ type: 'varchar', length: 255, nullable: true })
  apiUrl: string; // TigoPesa API URL (for A2W if needed in future)

  @Column({ type: 'varchar', length: 20, nullable: true })
  disbursementMsisdn: string; // Partner's TigoPesa disbursement account (for A2W)

  @Column({ type: 'varchar', length: 4, nullable: true })
  disbursementPin: string; // Encrypted PIN for disbursement (for A2W)

  @Column({ type: 'varchar', length: 20, nullable: true })
  brandId: string; // Brand ID for A2W transactions

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
