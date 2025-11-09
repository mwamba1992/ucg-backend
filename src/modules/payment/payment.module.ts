import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentReference } from '../reference/entities/payment-reference.entity';
import { ReferenceModule } from '../reference/reference.module'; // Import the ReferenceModule
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentReference]),
    ReferenceModule, // Make ReferenceService available here
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
