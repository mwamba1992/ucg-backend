import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CBSService } from './cbs.service';
import { CBSTransfer } from './entities/cbs-transfer.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CBSTransfer]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
    forwardRef(() => AuthModule), // <-- use forwardRef
  ],
  providers: [CBSService],
  exports: [CBSService],
})
export class CBSModule {}
