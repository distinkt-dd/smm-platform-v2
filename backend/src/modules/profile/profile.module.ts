import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service.js';
import { ProfileController } from './profile.controller.js';
import { ProfileRepository } from './repositories/profile.repository.js';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, ProfileRepository],
})
export class ProfileModule {}
