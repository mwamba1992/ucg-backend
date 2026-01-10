import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialServiceProviderService } from './financial-service-provider.service';
import { FinancialServiceProviderController } from './financial-service-provider.controller';
import { FinancialServiceProvider } from './entities/financial-service-provider.entity';
import { Payment } from '../payment/entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialServiceProvider, Payment])],
  controllers: [FinancialServiceProviderController],
  providers: [FinancialServiceProviderService],
  exports: [FinancialServiceProviderService],
})
export class FinancialServiceProviderModule {}
