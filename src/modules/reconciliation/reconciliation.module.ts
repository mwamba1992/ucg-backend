import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';
import { Settlement } from './entities/settlement.entity';
import { Payment } from '../payment/entities/payment.entity';
import { PaymentReference } from '../reference/entities/payment-reference.entity';
import { ServiceProvider } from '../service-provider/entities/service-provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Settlement,
      Payment,
      PaymentReference,
      ServiceProvider,
    ]),
  ],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
