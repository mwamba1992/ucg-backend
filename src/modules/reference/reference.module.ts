import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceController } from './reference.controller';
import { SpReferenceController } from './sp-reference.controller';
import { ReferenceService } from './reference.service';
import { PaymentReference } from './entities/payment-reference.entity';
import { ReferenceBatch } from './entities/reference-batch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentReference, ReferenceBatch])],
  controllers: [ReferenceController, SpReferenceController],
  providers: [ReferenceService],
  exports: [ReferenceService],
})
export class ReferenceModule {}
