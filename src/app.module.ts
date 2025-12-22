import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/typeorm.config';
import { ServiceProviderModule } from './modules/service-provider/service-provider.module';
import { ReferenceModule } from './modules/reference/reference.module';
import { PaymentModule } from './modules/payment/payment.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { RabbitmqModule } from './modules/rabbitmq/rabbitmq.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { CBSModule } from './modules/cbs/cbs.module';
import { MpesaModule } from './modules/mpesa/mpesa.module';
import { TigoPesaModule } from './modules/tigopesa/tigopesa.module';
import { FinancialServiceProviderModule } from './modules/financial-service-provider/financial-service-provider.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database module
    TypeOrmModule.forRootAsync({
      useFactory: typeOrmConfig,
    }),

    // RabbitMQ module (Global)
    RabbitmqModule,

    // Authentication & Authorization modules
    AuthModule,
    UserModule,

    // Feature modules
    ServiceProviderModule,
    FinancialServiceProviderModule, // Banks and MNOs
    ReferenceModule,
    PaymentModule,
    WorkflowModule,
    DashboardModule,
    ReconciliationModule,
    CBSModule, // CBS integration for fund transfers
    MpesaModule, // M-Pesa C2B payment integration
    TigoPesaModule, // TigoPesa W2A payment integration
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply JWT guard globally to all routes
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Apply Roles guard globally
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
