import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TigoPesaTransaction } from './entities/tigopesa-transaction.entity';
import { TigoPesaConfig } from './entities/tigopesa-config.entity';
import { TigoPesaController } from './tigopesa.controller';
import { TigoPesaConsumer } from './tigopesa.consumer';
import { TigoPesaService } from './tigopesa.service';
import { TigoPesaProducer } from './tigopesa.producer';
import { RABBITMQ_QUEUES } from '../../config/rabbitmq.config';
import { PaymentModule } from '../payment/payment.module';
import { ReferenceModule } from '../reference/reference.module';
import { CBSModule } from '../cbs/cbs.module';
import { ApefModule } from '../apef/apef.module';

@Module({
  imports: [
    // TypeORM for TigoPesa entities
    TypeOrmModule.forFeature([TigoPesaTransaction, TigoPesaConfig]),

    // RabbitMQ Client for TigoPesa queues
    ClientsModule.registerAsync([
      {
        name: 'TIGOPESA_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: RABBITMQ_QUEUES.TIGOPESA_PAYMENT_PROCESSING,
            queueOptions: {
              durable: true,
              arguments: {
                'x-message-ttl': 3600000, // 1 hour message TTL
                'x-max-priority': 10, // Enable priority queuing
              },
            },
            prefetchCount: 1, // Process one message at a time
            // Note: noAck should NOT be set for ClientProxy (producer side)
          },
        }),
        inject: [ConfigService],
      },
    ]),

    // Import other modules
    PaymentModule,
    ReferenceModule,
    CBSModule,
    forwardRef(() => ApefModule), // APEF integration for 90 prefix references
  ],
  controllers: [
    TigoPesaController, // HTTP REST endpoints
    TigoPesaConsumer,   // RabbitMQ message consumer
  ],
  providers: [
    TigoPesaService,    // Business logic
    TigoPesaProducer,   // RabbitMQ message producer
  ],
  exports: [
    TigoPesaService,    // Export for use in other modules
    TigoPesaProducer,   // Export for queuing from other modules
  ],
})
export class TigoPesaModule {}
