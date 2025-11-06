import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      message: 'UCG API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
