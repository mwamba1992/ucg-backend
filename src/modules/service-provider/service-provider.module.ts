import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ServiceProviderController } from './service-provider.controller';
import { ServiceProviderService } from './service-provider.service';
import { SpReferenceQueryService } from './sp-reference-query.service';
import { ServiceProvider } from './entities/service-provider.entity';
import { ServiceProviderContact } from './entities/service-provider-contact.entity';
import { ServiceProviderBankAccount } from './entities/service-provider-bank-account.entity';
import { ServiceProviderSettings } from './entities/service-provider-settings.entity';
import { WorkflowModule } from '../workflow/workflow.module';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceProvider,
      ServiceProviderContact,
      ServiceProviderBankAccount,
      ServiceProviderSettings,
    ]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    WorkflowModule,
    NotificationModule,
    UserModule,
  ],
  controllers: [ServiceProviderController],
  providers: [ServiceProviderService, SpReferenceQueryService],
  exports: [ServiceProviderService, SpReferenceQueryService],
})
export class ServiceProviderModule {}
