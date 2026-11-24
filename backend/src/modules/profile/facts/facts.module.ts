import { Module } from '@nestjs/common';
import { FactsService } from './facts.service.js';
import { FactRepository } from './repositories/fact.repository.js';
import { FactsController } from './facts.controller.js';

@Module({
  controllers: [FactsController],
  providers: [FactsService, FactRepository],
  exports: [FactsService],
})
export class FactsModule {}
