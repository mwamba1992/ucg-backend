import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Enable CORS
  app.enableCors();

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
    .addTag('References', 'Payment reference generation and management')
    .addTag('Payments Service', 'Payment processing and tracking')
    .addTag('Workflows', 'Workflow management and task processing')
    .addServer(`http://localhost:${process.env.PORT || 3000}`, 'Local Development')
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
  await app.listen(port);

  console.log(`
    🚀 UCG API Server is running!
    📝 API Documentation: http://localhost:${port}/api/docs
    🔗 API Endpoint: http://localhost:${port}/${apiPrefix}
  `);
}

bootstrap();
