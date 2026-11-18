import { Global, Module } from '@nestjs/common';
import { EnvConfig } from './env.service.js';

@Global()
@Module({
  providers: [EnvConfig],
  exports: [EnvConfig],
})
export class EnvModule {}
