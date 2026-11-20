import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { TUserPublic } from '../../common/types/user.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ProfileService } from './profile.service.js';
import { ProfileDto } from './dto/profile.dto.js';

@Controller('me/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfileByUserId(@Req() req: Request & { user: TUserPublic }) {
    return this.profileService.getProfileByUserId(req.user.id);
  }

  @Put()
  putProfileByUserId(@Body() dto: ProfileDto, @Req() req: Request & {user: TUserPublic}) {
    return this.profileService.putProfileByUserId(req.user.id, dto);
  }
}
