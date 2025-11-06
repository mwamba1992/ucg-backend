import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceController } from './reference.controller';
import { ReferenceService } from './reference.service';
import { PaymentReference } from './entities/payment-reference.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentReference])],
  controllers: [ReferenceController],
  providers: [ReferenceService],
  exports: [ReferenceService],
})
export class ReferenceModule {}
