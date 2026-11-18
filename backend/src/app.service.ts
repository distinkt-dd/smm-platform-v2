import { Injectable } from '@nestjs/common';
import { PrismaService } from './modules/prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prismaService: PrismaService) {}
  async getHello(): Promise<number> {
    return this.prismaService.user.count();
  }
}
