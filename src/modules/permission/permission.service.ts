import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { RolesService } from './roles.service';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  /** Process-local cache of role -> set of granted permission codes. */
  private readonly cache = new Map<string, Set<string>>();

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    private readonly rolesService: RolesService,
  ) {}

  /** Resolve a role to its granted permission codes (cached). */
  async getPermissionsForRole(role: string): Promise<Set<string>> {
    const cached = this.cache.get(role);
    if (cached) {
      return cached;
    }

    const rows = await this.rolePermissionRepository.find({
      where: { role },
      relations: ['permission'],
    });
    const set = new Set(
      rows
        .filter((row) => row.permission && row.permission.isActive)
        .map((row) => row.permission.code),
    );
    this.cache.set(role, set);
    return set;
  }

  /** List the active permission catalog ordered by module then code. */
  listCatalog(): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { isActive: true },
      order: { module: 'ASC', code: 'ASC' },
    });
  }

  /** Return the granted permission codes for a role as an array. */
  async getRolePermissions(role: string): Promise<string[]> {
    return Array.from(await this.getPermissionsForRole(role));
  }

  /** Replace the entire permission set for a role. */
  async setRolePermissions(role: string, codes: string[]): Promise<string[]> {
    await this.assertValidRole(role);
    const permissions = await this.resolveCodes(codes);

    await this.rolePermissionRepository.delete({ role });
    if (permissions.length > 0) {
      await this.rolePermissionRepository.save(
        permissions.map((permission) =>
          this.rolePermissionRepository.create({ role, permissionId: permission.id }),
        ),
      );
    }

    this.invalidate(role);
    return this.getRolePermissions(role);
  }

  /** Add permissions to a role (existing pairs are left untouched). */
  async addRolePermissions(role: string, codes: string[]): Promise<string[]> {
    await this.assertValidRole(role);
    const permissions = await this.resolveCodes(codes);

    const existing = await this.rolePermissionRepository.find({ where: { role } });
    const existingIds = new Set(existing.map((row) => row.permissionId));
    const toAdd = permissions.filter((permission) => !existingIds.has(permission.id));

    if (toAdd.length > 0) {
      await this.rolePermissionRepository.save(
        toAdd.map((permission) =>
          this.rolePermissionRepository.create({ role, permissionId: permission.id }),
        ),
      );
    }

    this.invalidate(role);
    return this.getRolePermissions(role);
  }

  /** Remove permissions from a role. */
  async removeRolePermissions(role: string, codes: string[]): Promise<string[]> {
    await this.assertValidRole(role);
    const permissions = await this.resolveCodes(codes);

    if (permissions.length > 0) {
      await this.rolePermissionRepository.delete({
        role,
        permissionId: In(permissions.map((permission) => permission.id)),
      });
    }

    this.invalidate(role);
    return this.getRolePermissions(role);
  }

  /** Drop the cache for a role (or everything). Next read reloads from the DB. */
  invalidate(role?: string): void {
    if (role) {
      this.cache.delete(role);
    } else {
      this.cache.clear();
    }
  }

  private async assertValidRole(role: string): Promise<void> {
    if (!(await this.rolesService.isValidRole(role))) {
      throw new BadRequestException(`Unknown role: ${role}`);
    }
  }

  /** Resolve codes to active catalog permissions, rejecting any unknown/inactive code. */
  private async resolveCodes(codes: string[]): Promise<Permission[]> {
    const unique = Array.from(new Set(codes ?? []));
    if (unique.length === 0) {
      return [];
    }

    const permissions = await this.permissionRepository.find({
      where: { code: In(unique), isActive: true },
    });
    const found = new Set(permissions.map((permission) => permission.code));
    const missing = unique.filter((code) => !found.has(code));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Unknown or inactive permission code(s): ${missing.join(', ')}`,
      );
    }
    return permissions;
  }
}
