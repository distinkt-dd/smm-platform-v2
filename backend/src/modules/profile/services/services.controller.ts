import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { TUserPublic } from '../../../common/types/user.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { ServicesService } from './services.service.js';

@Controller('me/profile/services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  create(
    @Body() dto: CreateServiceDto,
    @Req() req: Request & { user: TUserPublic },
  ) {
    return this.servicesService.create(req.user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @Req() req: Request & { user: TUserPublic },
  ) {
    return this.servicesService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: Request & { user: TUserPublic }) {
    return this.servicesService.remove(req.user.id, id);
  }
}
