import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegistrationUserDto } from './dto/registration-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

import type { Request } from 'express';
import { TUserPublic } from '../../common/types/user.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  register(@Body() dto: RegistrationUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginUserDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & {user: TUserPublic}) {
    return req.user;
  }
}
