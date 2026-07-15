import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { WinstonLoggerService } from './common/logging/winston-logger.service';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  // Buffer early logs until our file logger is attached, then route everything through it.
  // bodyParser: false so we register parsers ourselves in a controlled order
  // (telco XML routes must be parsed as text before the JSON parser can see them).
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  app.useLogger(app.get(WinstonLoggerService));

  // Connect RabbitMQ microservice for reference generation queue
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'ucg.reference.generation',
      queueOptions: {
        durable: true,
      },
      noAck: false,
      prefetchCount: 10,
    },
  });

  // Connect RabbitMQ microservice for notification queue
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'ucg.reference.notification',
      queueOptions: {
        durable: true,
        arguments: {
          // Dead Letter Exchange - failed messages go here after max retries
          'x-dead-letter-exchange': 'ucg.dlx',
          'x-dead-letter-routing-key': 'reference.notification.failed',
        },
      },
      noAck: false,
      prefetchCount: 5, // Lower prefetch for callbacks
    },
  });

  // Connect RabbitMQ microservice for M-Pesa payment processing queue
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'ucg.mpesa.payment.processing',
      queueOptions: {
        durable: true,
        arguments: {
          'x-message-ttl': 3600000, // 1 hour message TTL
          'x-max-priority': 10,
        },
      },
      noAck: false,
      prefetchCount: 1, // Process one M-Pesa payment at a time
    },
  });

  // Connect RabbitMQ microservice for M-Pesa callback queue
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'ucg.mpesa.callback',
      queueOptions: {
        durable: true,
        arguments: {
          'x-message-ttl': 3600000,
        },
      },
      noAck: false,
      prefetchCount: 1,
    },
  });

  // Connect RabbitMQ microservice for Airtel payment processing queue
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'ucg.airtel.payment.processing',
      queueOptions: {
        durable: true,
        arguments: {
          'x-message-ttl': 3600000,
          'x-max-priority': 10,
        },
      },
      noAck: false,
      prefetchCount: 1,
    },
  });

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Enable CORS
  app.enableCors();

  // Body parsing.
  //
  // Telco C2B webhooks (Vodacom M-Pesa, Mixx TigoPesa, Airtel) send their
  // payload as XML under a <COMMAND>/<Request> root. Some aggregators mislabel
  // the Content-Type (e.g. send the XML as application/json), which made the
  // default JSON parser try to JSON.parse the "<COMMAND>..." body and reject it
  // with 400 "Unexpected token '<'". To avoid depending on the caller's
  // Content-Type, parse these routes as raw text for ANY Content-Type.
  //
  // These route-scoped text parsers are registered BEFORE the global JSON parser
  // so they consume and mark the body first; the JSON parser then skips them.
  const XML_WEBHOOK_ROUTES = [
    '/api/v1/vodacom/transaction',
    '/api/v1/mixx/transaction',
    '/api/v1/airtel/validate',
    '/api/v1/airtel/process',
    '/api/v1/airtel/enquiry',
    '/api/v1/airtel/billfetch',
    '/api/v1/airtel/lookup',
  ];
  for (const route of XML_WEBHOOK_ROUTES) {
    app.use(route, bodyParser.text({ type: () => true, limit: '5mb' }));
  }

  // Default parsers for the rest of the API (JSON + form-urlencoded).
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('UCG API')
    .setDescription(
      'Unified Collection Gateway API - A comprehensive payment collection platform\n\n' +
      'Features:\n' +
      '- Service Provider Management\n' +
      '- Payment Reference Generation (with 5 Payment Options)\n' +
      '- Payment Processing\n' +
      '- Workflow Management (KYC, Approval)\n' +
      '- Bank Account Management'
    )
    .setVersion('1.0.0')
    .setContact(
      'UCG Support',
      'https://ucg.mhb.co.tz',
      'support@ucg.mhb.co.tz'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT-auth'
    )
    .addTag('Service Providers', 'Service Provider onboarding and management')
    .addTag('Bank Accounts', 'Manage service provider bank accounts')
    .addTag('Payment References', 'Payment reference generation and management (Admin)')
    .addTag('Service Provider - References', 'Payment reference API for service providers')
    .addTag('Payments Service', 'Payment processing and tracking')
    .addTag('Workflows', 'Workflow management and task processing')
    // .addServer(`http://localhost:${process.env.PORT || 3000}`, 'Local Development')
    .addServer(`http://192.168.1.98:${process.env.PORT || 3000}`, 'Local Development')
    .addServer('https://api.ucg.mhb.co.tz', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (
      controllerKey: string,
      methodKey: string
    ) => methodKey,
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
    customSiteTitle: 'UCG API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1976d2 }
    `,
  });

  const port = process.env.PORT || 3000;

  // Start all microservices first
  await app.startAllMicroservices();

  // Then start HTTP server
  await app.listen(port);

  console.log(`
    🚀 UCG API Server is running!
    // 📝 API Documentation: http://localhost:${port}/api/docs
    📝 API Documentation: http://192.168.1.98:${port}/api/docs
    🔗 API Endpoint: http://192.168.1.98:${port}/${apiPrefix}
    🐰 RabbitMQ Consumers: Active
  `);
}

bootstrap();
