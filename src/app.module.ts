import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/typeorm.config';
import { ServiceProviderModule } from './modules/service-provider/service-provider.module';
import { ReferenceModule } from './modules/reference/reference.module';
import { PaymentModule } from './modules/payment/payment.module';
import { WorkflowModule } from './modules/workflow/workflow.module';

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

    // Feature modules
    ServiceProviderModule,
    ReferenceModule,
    PaymentModule,
    WorkflowModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
