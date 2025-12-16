import { Transport, RmqOptions } from '@nestjs/microservices';

export const rabbitmqConfig = (): RmqOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
    queue: process.env.RABBITMQ_QUEUE || 'ucg_queue',
    noAck: false,
    persistent: true,
    queueOptions: {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 hours
        'x-dead-letter-exchange': 'ucg.dlx',
      },
    },
    prefetchCount: 10,
  },
});

// Queue names
export const RABBITMQ_QUEUES = {
  REFERENCE_GENERATION: 'ucg.reference.generation',
  REFERENCE_BULK: 'ucg.reference.bulk',
  REFERENCE_VALIDATION: 'ucg.reference.validation',
  REFERENCE_NOTIFICATION: 'ucg.reference.notification',
  PAYMENT_PROCESSING: 'ucg.payment.processing',
  PAYMENT_NOTIFICATION: 'ucg.payment.notification',
  MPESA_PAYMENT_PROCESSING: 'ucg.mpesa.payment.processing',
  MPESA_CALLBACK: 'ucg.mpesa.callback',
  MPESA_VALIDATION: 'ucg.mpesa.validation',
  TIGOPESA_PAYMENT_PROCESSING: 'ucg.tigopesa.payment.processing',
} as const;

// Exchange names
export const RABBITMQ_EXCHANGES = {
  REFERENCE: 'ucg.reference.exchange',
  PAYMENT: 'ucg.payment.exchange',
  MPESA: 'ucg.mpesa.exchange',
  TIGOPESA: 'ucg.tigopesa.exchange',
  DLX: 'ucg.dlx', // Dead Letter Exchange
} as const;

// Routing keys
export const RABBITMQ_ROUTING_KEYS = {
  REFERENCE_CREATE: 'reference.create',
  REFERENCE_BULK: 'reference.bulk',
  REFERENCE_VALIDATE: 'reference.validate',
  REFERENCE_NOTIFY: 'reference.notify',
  PAYMENT_PROCESS: 'payment.process',
  PAYMENT_NOTIFY: 'payment.notify',
  MPESA_PAYMENT_PROCESS: 'mpesa.payment.process',
  MPESA_CALLBACK_SEND: 'mpesa.callback.send',
  MPESA_VALIDATE: 'mpesa.validate',
  TIGOPESA_PAYMENT_PROCESS: 'tigopesa.payment.process',
} as const;
