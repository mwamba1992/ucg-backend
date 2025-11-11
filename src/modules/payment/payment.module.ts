import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentReference } from '../reference/entities/payment-reference.entity';
import { ReferenceModule } from '../reference/reference.module'; // Import the ReferenceModule
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentProducer } from './payment.producer';
import { PaymentConsumer } from './payment.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentReference]),
    ReferenceModule, // Make ReferenceService available here
  ],
  controllers: [PaymentController, PaymentConsumer],
  providers: [PaymentService, PaymentProducer],
  exports: [PaymentService, PaymentProducer],
})
export class PaymentModule {}
