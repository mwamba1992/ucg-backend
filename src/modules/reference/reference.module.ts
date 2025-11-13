import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ReferenceController } from './reference.controller';
import { SpReferenceController } from './sp-reference.controller';
import { ReferenceService } from './reference.service';
import { PaymentReference } from './entities/payment-reference.entity';
import { ReferenceLineItem } from './entities/reference-line-item.entity';
import { ReferenceBatch } from './entities/reference-batch.entity';
import { ServiceProvider } from '../service-provider/entities/service-provider.entity';
import { ReferenceProducer } from './reference.producer';
import { ReferenceConsumer } from './reference.consumer';
import { NotificationConsumer } from './notification.consumer';
import { AdminNotificationController } from './admin-notification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentReference, ReferenceLineItem, ReferenceBatch, ServiceProvider]),
    HttpModule,
  ],
  controllers: [ReferenceController, SpReferenceController, ReferenceConsumer, NotificationConsumer, AdminNotificationController],
  providers: [ReferenceService, ReferenceProducer],
  exports: [ReferenceService, ReferenceProducer],
})
export class ReferenceModule {}
