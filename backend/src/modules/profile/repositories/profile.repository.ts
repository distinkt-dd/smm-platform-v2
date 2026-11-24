import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { ProfilePublic } from "../types/profile.js";
import { ProfileDto} from "../dto/profile.dto.js";

@Injectable()
export class ProfileRepository {
    constructor(private readonly prismaService: PrismaService) {}

    async findProfileByUserId(userId: string): Promise<ProfilePublic | null> {
        return await this.prismaService.masterProfile.findUnique({
            where: {
                userId
            },
            select: {
                id: true,
                displayName: true,
                specialization: true,
                about: true,
                confirmedFacts: true,
                services: true,
            },
        })
    }

    async getProfileByUserId(userId: string): Promise<ProfilePublic | null> {
        return await this.findProfileByUserId(userId);
    }

    async putProfileByUserId(userId: string, dto: ProfileDto): Promise<ProfilePublic | null> {
        // Пустая строка (и `null`) очищают описание: в базе остаётся `null`.
        // Отсутствующее поле — «не менять»: иначе клиент, который ещё не
        // передаёт `about`, стирал бы описание при каждом сохранении.
        const about = dto.about?.trim() ? dto.about.trim() : null;

        await this.prismaService.masterProfile.upsert({
            where: {
                userId
            },
            create: {
                userId,
                displayName: dto.displayName,
                specialization: dto.specialization,
                about

            },
            update: {
                displayName: dto.displayName,
                specialization: dto.specialization,
                about: dto.about === undefined ? undefined : about
            },
        })

        return this.findProfileByUserId(userId)
    }
}