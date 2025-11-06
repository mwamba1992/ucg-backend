import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceProviderController } from './service-provider.controller';
import { ServiceProviderService } from './service-provider.service';
import { ServiceProvider } from './entities/service-provider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceProvider])],
  controllers: [ServiceProviderController],
  providers: [ServiceProviderService],
  exports: [ServiceProviderService],
})
export class ServiceProviderModule {}
