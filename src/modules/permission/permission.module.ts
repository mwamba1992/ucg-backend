import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Role } from './entities/role.entity';
import { User } from '../user/entities/user.entity';
import { PermissionsService } from './permission.service';
import { RolesService } from './roles.service';
import { PermissionController } from './permission.controller';
import { RolesAdminController } from './roles-admin.controller';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, RolePermission, Role, User])],
  controllers: [PermissionController, RolesAdminController],
  providers: [PermissionsService, RolesService, PermissionsGuard],
  exports: [PermissionsService, RolesService, PermissionsGuard],
})
export class PermissionModule {}
