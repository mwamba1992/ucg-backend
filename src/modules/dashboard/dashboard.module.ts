import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PaymentReference } from '../reference/entities/payment-reference.entity';
import { Payment } from '../payment/entities/payment.entity';
import { ServiceProvider } from '../service-provider/entities/service-provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentReference, Payment, ServiceProvider]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
