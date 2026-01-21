import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PspManagementController } from './psp-management.controller';
import { UserModule } from '../user/user.module';
import { User } from '../user/entities/user.entity';
import { ServiceProvider } from '../service-provider/entities/service-provider.entity';
import { ServiceProviderContact } from '../service-provider/entities/service-provider-contact.entity';
import { ServiceProviderBankAccount } from '../service-provider/entities/service-provider-bank-account.entity';
import { ServiceProviderSettings } from '../service-provider/entities/service-provider-settings.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SpJwtStrategy } from './strategies/sp-jwt.strategy';
import { PspApiStrategy } from './strategies/psp-api.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SpJwtAuthGuard } from './guards/sp-jwt-auth.guard';
import { PspApiAuthGuard } from './guards/psp-api-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ServiceProvider,
      ServiceProviderContact,
      ServiceProviderBankAccount,
      ServiceProviderSettings,
    ]),
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
  controllers: [AuthController, PspManagementController],
  providers: [AuthService, JwtStrategy, SpJwtStrategy, PspApiStrategy, LocalStrategy, JwtAuthGuard, SpJwtAuthGuard, PspApiAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, SpJwtAuthGuard, PspApiAuthGuard, RolesGuard],
})
export class AuthModule {}
