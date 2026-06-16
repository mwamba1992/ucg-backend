import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { User } from '../user/entities/user.entity';

export interface CreateRoleInput {
  name: string;
  label: string;
  description?: string;
  userType?: string;
}

@Injectable()
export class RolesService {
  /** Cache of active role names for fast validation. null = not loaded yet. */
  private validRoles: Set<string> | null = null;

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async loadCache(): Promise<Set<string>> {
    if (this.validRoles) return this.validRoles;
    const rows = await this.roleRepository.find({ where: { isActive: true } });
    this.validRoles = new Set(rows.map((r) => r.name));
    return this.validRoles;
  }

  invalidate(): void {
    this.validRoles = null;
  }

  async isValidRole(name: string): Promise<boolean> {
    return (await this.loadCache()).has(name);
  }

  list(userType?: string): Promise<Role[]> {
    const where = userType ? { userType } : {};
    return this.roleRepository.find({ where, order: { isSystem: 'DESC', label: 'ASC' } });
  }

  async getByName(name: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { name } });
    if (!role) throw new NotFoundException(`Role ${name} not found`);
    return role;
  }

  /** Normalize a free-text name to UPPER_SNAKE_CASE (e.g. "Branch Manager" -> BRANCH_MANAGER). */
  static normalizeName(raw: string): string {
    return (raw || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  async create(input: CreateRoleInput): Promise<Role> {
    const name = RolesService.normalizeName(input.name);
    if (!name) {
      throw new BadRequestException('Role name is required');
    }
    const existing = await this.roleRepository.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException(`Role ${name} already exists`);
    }
    const role = this.roleRepository.create({
      name,
      label: input.label?.trim() || name,
      description: input.description?.trim() || null,
      userType: input.userType || 'ADMIN',
      isSystem: false,
      isActive: true,
    });
    const saved = await this.roleRepository.save(role);
    this.invalidate();
    return saved;
  }

  async update(
    name: string,
    changes: { label?: string; description?: string; isActive?: boolean },
  ): Promise<Role> {
    const role = await this.getByName(name);
    if (changes.label !== undefined) role.label = changes.label;
    if (changes.description !== undefined) role.description = changes.description;
    if (changes.isActive !== undefined) {
      if (role.isSystem && changes.isActive === false) {
        throw new BadRequestException('System roles cannot be deactivated');
      }
      role.isActive = changes.isActive;
    }
    const saved = await this.roleRepository.save(role);
    this.invalidate();
    return saved;
  }

  async remove(name: string): Promise<void> {
    const role = await this.getByName(name);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    const usersWithRole = await this.userRepository.count({ where: { role: name } });
    if (usersWithRole > 0) {
      throw new BadRequestException(
        `Cannot delete role ${name}: ${usersWithRole} user(s) still assigned to it`,
      );
    }
    await this.roleRepository.delete({ name });
    this.invalidate();
  }
}
