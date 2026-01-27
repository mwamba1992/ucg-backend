import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { ApefReference } from './entities/apef-reference.entity';
import { ApefPayment } from './entities/apef-payment.entity';

// Services
import { ApefClientService } from './apef-client.service';
import { ApefPaymentService } from './apef-payment.service';
import { PaymentRouterService } from './payment-router.service';
import { ApefNotificationScheduler } from './apef-notification.scheduler';

// Controller
import { ApefController } from './apef.controller';

// External modules
import { CBSModule } from '../cbs/cbs.module';
import { PaymentModule } from '../payment/payment.module';
import { FinancialServiceProvider } from '../financial-service-provider/entities/financial-service-provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApefReference,
      ApefPayment,
      FinancialServiceProvider,
    ]),
    HttpModule.register({
      timeout: 30000, // 30 seconds timeout for APEF API calls
      maxRedirects: 5,
    }),
    ConfigModule,
    ScheduleModule.forRoot(),
    CBSModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [ApefController],
  providers: [
    ApefClientService,
    ApefPaymentService,
    PaymentRouterService,
    ApefNotificationScheduler,
  ],
  exports: [
    ApefClientService,
    ApefPaymentService,
    PaymentRouterService,
  ],
})
export class ApefModule {}
