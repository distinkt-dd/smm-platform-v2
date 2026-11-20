import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfileRepository } from './repositories/profile.repository.js';
import { ProfilePublic } from './types/profile.js';
import { ProfileDto } from './dto/profile.dto.js';

@Injectable()
export class ProfileService {
    constructor(private readonly profileRepository: ProfileRepository) {}

    async getProfileByUserId(userId: string): Promise<ProfilePublic> {
        const profile = await this.profileRepository.getProfileByUserId(userId);
        if (!profile) {
            throw new NotFoundException(`Профиль не найден!`);
        }
        return profile;
    }

    async putProfileByUserId(userId: string, dto: ProfileDto): Promise<ProfilePublic> {
        const profile = await this.profileRepository.putProfileByUserId(userId, dto);
        if (!profile) {
            throw new NotFoundException(`Профиль не найден!`);
        }
        return profile;
    }
}
