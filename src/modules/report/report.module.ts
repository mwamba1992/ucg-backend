import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Payment } from '../payment/entities/payment.entity';
import { PaymentReference } from '../reference/entities/payment-reference.entity';
import { ServiceProvider } from '../service-provider/entities/service-provider.entity';

import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { SpReportService } from './sp-report.service';
import { SpReportController } from './sp-report.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      PaymentReference,
      ServiceProvider,
    ]),
  ],
  controllers: [ReportController, SpReportController],
  providers: [ReportService, SpReportService],
  exports: [ReportService, SpReportService],
})
export class ReportModule {}
