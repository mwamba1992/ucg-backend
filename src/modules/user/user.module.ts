import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { SpUserController } from './sp-user.controller';
import { RolesController } from './roles.controller';
import { User } from './entities/user.entity';
import { UserServiceProvider } from './entities/user-service-provider.entity';
import { ServiceProvider } from '../service-provider/entities/service-provider.entity';
import { SpMembershipService } from './sp-membership.service';
import { NotificationModule } from '../notification/notification.module';
import { PermissionModule } from '../permission/permission.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserServiceProvider, ServiceProvider]),
    NotificationModule,
    PermissionModule,
  ],
  controllers: [UserController, SpUserController, RolesController],
  providers: [UserService, SpMembershipService],
  exports: [UserService, SpMembershipService],
})
export class UserModule {}
