import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialServiceProviderService } from './financial-service-provider.service';
import { FinancialServiceProviderController } from './financial-service-provider.controller';
import { FinancialServiceProvider } from './entities/financial-service-provider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialServiceProvider])],
  controllers: [FinancialServiceProviderController],
  providers: [FinancialServiceProviderService],
  exports: [FinancialServiceProviderService],
})
export class FinancialServiceProviderModule {}
