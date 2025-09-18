import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'YaPague! Payment Management System API is running! 🚀';
  }
}
