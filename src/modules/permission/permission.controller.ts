import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import { PermissionsService } from './permission.service';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { ModifyRolePermissionsDto } from './dto/modify-role-permissions.dto';

/**
 * Admin management API for the dynamic permission system. The frontend interface uses
 * these endpoints to assign permissions to roles at runtime. Guarded by
 * `system:roles:manage` (SUPER_ADMIN bypasses in the guard).
 */
@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@RequirePermissions('system:roles:manage')
export class PermissionController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'List the full permission catalog' })
  @ApiResponse({ status: 200, description: 'Active permissions ordered by module' })
  async listCatalog() {
    return { success: true, data: await this.permissionsService.listCatalog() };
  }

  @Get('roles/:role')
  @ApiOperation({ summary: 'Get the permission codes assigned to a role' })
  @ApiParam({ name: 'role', description: 'UserRole value, e.g. OPERATIONS_MANAGER' })
  @ApiResponse({ status: 200, description: 'Permission codes for the role' })
  async getRolePermissions(@Param('role') role: string) {
    return {
      success: true,
      data: await this.permissionsService.getRolePermissions(role),
    };
  }

  @Put('roles/:role')
  @ApiOperation({ summary: 'Replace the permissions assigned to a role' })
  @ApiParam({ name: 'role', description: 'UserRole value, e.g. OPERATIONS_MANAGER' })
  @ApiResponse({ status: 200, description: 'Updated permission codes for the role' })
  async setRolePermissions(
    @Param('role') role: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return {
      success: true,
      data: await this.permissionsService.setRolePermissions(role, dto.permissions),
    };
  }

  @Post('roles/:role')
  @ApiOperation({ summary: 'Add permissions to a role' })
  @ApiParam({ name: 'role', description: 'UserRole value, e.g. OPERATIONS_MANAGER' })
  @ApiResponse({ status: 201, description: 'Updated permission codes for the role' })
  async addRolePermissions(
    @Param('role') role: string,
    @Body() dto: ModifyRolePermissionsDto,
  ) {
    return {
      success: true,
      data: await this.permissionsService.addRolePermissions(role, dto.permissions),
    };
  }

  @Delete('roles/:role')
  @ApiOperation({ summary: 'Remove permissions from a role' })
  @ApiParam({ name: 'role', description: 'UserRole value, e.g. OPERATIONS_MANAGER' })
  @ApiResponse({ status: 200, description: 'Updated permission codes for the role' })
  async removeRolePermissions(
    @Param('role') role: string,
    @Body() dto: ModifyRolePermissionsDto,
  ) {
    return {
      success: true,
      data: await this.permissionsService.removeRolePermissions(role, dto.permissions),
    };
  }
}
