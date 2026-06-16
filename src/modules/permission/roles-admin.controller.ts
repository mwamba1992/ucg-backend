import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

/**
 * Admin management of roles (create/update/delete). Read endpoints live in RolesController
 * (GET /roles*). Guarded by `system:roles:manage` (SUPER_ADMIN bypasses in the guard).
 */
@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@RequirePermissions('system:roles:manage')
export class RolesAdminController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new (admin-portal) role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  async create(@Body() dto: CreateRoleDto) {
    return { success: true, data: await this.rolesService.create(dto) };
  }

  @Patch(':name')
  @ApiOperation({ summary: 'Update a role (label/description/active)' })
  @ApiParam({ name: 'name', description: 'Role name, e.g. BRANCH_MANAGER' })
  async update(@Param('name') name: string, @Body() dto: UpdateRoleDto) {
    return { success: true, data: await this.rolesService.update(name, dto) };
  }

  @Delete(':name')
  @ApiOperation({ summary: 'Delete a non-system role with no assigned users' })
  @ApiParam({ name: 'name', description: 'Role name, e.g. BRANCH_MANAGER' })
  async remove(@Param('name') name: string) {
    await this.rolesService.remove(name);
    return { success: true };
  }
}
