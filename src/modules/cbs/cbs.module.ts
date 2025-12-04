import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CBSService } from './cbs.service';
import { CBSTransfer } from './entities/cbs-transfer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CBSTransfer]),
    HttpModule.register({
      timeout: 30000, // 30 seconds for CBS operations
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [CBSService],
  exports: [CBSService],
})
export class CBSModule {}
