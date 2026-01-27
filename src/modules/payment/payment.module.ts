import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { SpPaymentController } from './sp-payment.controller';
import { PspPaymentController } from './psp-payment.controller';
import { PaymentReference } from '../reference/entities/payment-reference.entity';
import { ReferenceModule } from '../reference/reference.module'; // Import the ReferenceModule
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentProducer } from './payment.producer';
import { PaymentConsumer } from './payment.consumer';
import { NotificationModule } from '../notification/notification.module';
import { CBSModule } from '../cbs/cbs.module';
import { FinancialServiceProvider } from '../financial-service-provider/entities/financial-service-provider.entity';
import { ApefModule } from '../apef/apef.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentReference, FinancialServiceProvider]),
    ReferenceModule, // Make ReferenceService available here
    NotificationModule,
    CBSModule, // Import CBS module for fund transfers
    forwardRef(() => ApefModule), // APEF integration for 90 prefix references
  ],
  controllers: [PaymentController, SpPaymentController, PspPaymentController, PaymentConsumer],
  providers: [PaymentService, PaymentProducer],
  exports: [PaymentService, PaymentProducer],
})
export class PaymentModule {}
