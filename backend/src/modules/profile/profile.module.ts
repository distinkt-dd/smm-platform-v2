import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service.js';
import { ProfileController } from './profile.controller.js';
import { ProfileRepository } from './repositories/profile.repository.js';
import { ServicesModule } from './services/services.module.js';
import { FactsModule } from './facts/facts.module.js';

@Module({
  imports: [ServicesModule, FactsModule],
  controllers: [ProfileController],
  providers: [ProfileService, ProfileRepository],
})
export class ProfileModule {}
