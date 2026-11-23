import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegistrationUserDto } from './dto/registration-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

import type { Request, Response } from 'express';
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
  async login(@Body() dto: LoginUserDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.login(dto);
    res.cookie('access_token', accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 3600000,
    });
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & {user: TUserPublic}) {
    return req.user;
  }
}
