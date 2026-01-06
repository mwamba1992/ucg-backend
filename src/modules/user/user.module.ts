import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { RolesController } from './roles.controller';
import { User } from './entities/user.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    NotificationModule,
  ],
  controllers: [UserController, RolesController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
