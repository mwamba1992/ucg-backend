import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MpesaTransaction } from './entities/mpesa-transaction.entity';
import { MpesaConfig } from './entities/mpesa-config.entity';
import { MpesaController } from './mpesa.controller';
import { MpesaConsumer } from './mpesa.consumer';
import { MpesaService } from './mpesa.service';
import { MpesaProducer } from './mpesa.producer';
import { RABBITMQ_QUEUES } from '../../config/rabbitmq.config';
import { PaymentModule } from '../payment/payment.module';
import { ReferenceModule } from '../reference/reference.module';
import { CBSModule } from '../cbs/cbs.module';
import { FinancialServiceProvider } from '../financial-service-provider/entities/financial-service-provider.entity';

@Module({
  imports: [
    // TypeORM for M-Pesa entities
    TypeOrmModule.forFeature([MpesaTransaction, MpesaConfig, FinancialServiceProvider]),

    // RabbitMQ Client for M-Pesa queues
    ClientsModule.registerAsync([
      // Payment Processing Queue
      {
        name: 'MPESA_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: RABBITMQ_QUEUES.MPESA_PAYMENT_PROCESSING,
            queueOptions: {
              durable: true,
              arguments: {
                'x-message-ttl': 3600000, // 1 hour message TTL
                'x-max-priority': 10, // Enable priority queuing
              },
            },
            prefetchCount: 1, // Process one message at a time
            // Note: noAck should NOT be set for ClientProxy (producer side)
            // It's only for the server/consumer side in main.ts
          },
        }),
        inject: [ConfigService],
      },
      // Callback Queue
      {
        name: 'MPESA_CALLBACK_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: RABBITMQ_QUEUES.MPESA_CALLBACK,
            queueOptions: {
              durable: true,
              arguments: {
                'x-message-ttl': 3600000, // 1 hour message TTL
              },
            },
            prefetchCount: 1,
            // Note: noAck should NOT be set for ClientProxy (producer side)
          },
        }),
        inject: [ConfigService],
      },
    ]),

    // HTTP module for M-Pesa callbacks
    HttpModule.register({
      timeout: 30000, // 30 seconds
      maxRedirects: 5,
    }),

    // Import other modules
    PaymentModule,
    ReferenceModule,
    CBSModule,
  ],
  controllers: [
    MpesaController, // HTTP REST endpoints
    MpesaConsumer,   // RabbitMQ message consumer
  ],
  providers: [
    MpesaService,    // Business logic
    MpesaProducer,   // RabbitMQ message producer
  ],
  exports: [
    MpesaService,    // Export for use in other modules
    MpesaProducer,   // Export for queuing from other modules
  ],
})
export class MpesaModule {}
