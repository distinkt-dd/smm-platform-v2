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
import { CreateFactDto } from './dto/create-fact.dto.js';
import { UpdateFactDto } from './dto/update-fact.dto.js';
import { FactsService } from './facts.service.js';

@Controller('me/profile/facts')
@UseGuards(JwtAuthGuard)
export class FactsController {
  constructor(private readonly factsService: FactsService) {}

  @Post()
  create(@Body() dto: CreateFactDto, @Req() req: Request & { user: TUserPublic }) {
    return this.factsService.create(req.user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFactDto,
    @Req() req: Request & { user: TUserPublic },
  ) {
    return this.factsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: Request & { user: TUserPublic }) {
    return this.factsService.remove(req.user.id, id);
  }
}
