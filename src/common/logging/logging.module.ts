import { Global, Module } from '@nestjs/common';
import { WinstonLoggerService } from './winston-logger.service';

/**
 * Global logging module. Exposes WinstonLoggerService so it can be set as the app logger
 * (in main.ts) and optionally injected anywhere a flow wants to write an explicit line.
 */
@Global()
@Module({
  providers: [WinstonLoggerService],
  exports: [WinstonLoggerService],
})
export class LoggingModule {}
