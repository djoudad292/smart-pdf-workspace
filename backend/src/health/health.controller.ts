import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
@SkipThrottle({ global: true, strict: true })
export class HealthController {
  @Get('api/health')
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
