import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Permission } from './permission.entity';

/**
 * Maps a UserRole (stored as its enum string value, e.g. 'OPERATIONS_MANAGER') to a
 * permission in the catalog. `role` is a plain varchar so any current or legacy
 * UserRole can be mapped without enum migrations; the service validates it.
 */
@Entity('role_permissions')
@Unique('UQ_role_permission', ['role', 'permissionId'])
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  role: string;

  @Column({ type: 'uuid' })
  @Index()
  permissionId: string;

  @ManyToOne(() => Permission, (permission) => permission.rolePermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;

  @CreateDateColumn()
  createdAt: Date;
}
