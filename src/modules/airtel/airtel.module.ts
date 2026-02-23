import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AirtelTransaction } from './entities/airtel-transaction.entity';
import { AirtelConfig } from './entities/airtel-config.entity';
import { AirtelController } from './airtel.controller';
import { AirtelConsumer } from './airtel.consumer';
import { AirtelService } from './airtel.service';
import { AirtelProducer } from './airtel.producer';
import { AirtelJwtGuard } from './guards/airtel-jwt.guard';
import { RABBITMQ_QUEUES } from '../../config/rabbitmq.config';
import { PaymentModule } from '../payment/payment.module';
import { ReferenceModule } from '../reference/reference.module';
import { CBSModule } from '../cbs/cbs.module';
import { ApefModule } from '../apef/apef.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AirtelTransaction, AirtelConfig]),

    ClientsModule.registerAsync([
      {
        name: 'AIRTEL_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: RABBITMQ_QUEUES.AIRTEL_PAYMENT_PROCESSING,
            queueOptions: {
              durable: true,
              arguments: {
                'x-message-ttl': 3600000,
                'x-max-priority': 10,
              },
            },
            prefetchCount: 1,
          },
        }),
        inject: [ConfigService],
      },
    ]),

    PaymentModule,
    ReferenceModule,
    CBSModule,
    forwardRef(() => ApefModule),
  ],
  controllers: [
    AirtelController,
    AirtelConsumer,
  ],
  providers: [
    AirtelService,
    AirtelProducer,
    AirtelJwtGuard,
  ],
  exports: [
    AirtelService,
    AirtelProducer,
  ],
})
export class AirtelModule {}
