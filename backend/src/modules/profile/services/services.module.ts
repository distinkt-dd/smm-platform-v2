import { Module } from '@nestjs/common';
import { ServicesService } from './services.service.js';
import { ServiceRepository } from './repositories/service.repository.js';
import { ServicesController } from './services.controller.js';

@Module({
  controllers: [ServicesController],
  providers: [ServicesService, ServiceRepository],
  exports: [ServicesService],
})
export class ServicesModule {}
