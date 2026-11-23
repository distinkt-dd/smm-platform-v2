import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { allowedOrigins } from '../configurations/env/cors.js';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    const origin = req.get('origin');
    if (!origin && !req.headers.cookie) return true; // Non-browser bearer clients.
    if (!origin || !allowedOrigins.includes(origin) || req.get('x-csrf-protection') !== '1') {
      throw new ForbiddenException('Недопустимый источник запроса');
    }
    return true;
  }
}
