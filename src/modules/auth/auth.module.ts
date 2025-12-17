import { Module} from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { User } from '../user/entities/user.entity';
import { ServiceProvider } from '../service-provider/entities/service-provider.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SpJwtStrategy } from './strategies/sp-jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SpJwtAuthGuard } from './guards/sp-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ServiceProvider]),
    UserModule,
    PassportModule,
    NotificationModule,
    HttpModule.register({ timeout: 30000 }), // <-- must import HttpModule
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key-change-this'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, SpJwtStrategy, LocalStrategy, JwtAuthGuard, SpJwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, SpJwtAuthGuard, RolesGuard],
})
export class AuthModule {}
