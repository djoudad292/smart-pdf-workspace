import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DatabaseService } from '../common/database.service';

@Controller()
@SkipThrottle({ global: true, strict: true })
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get('api/health')
  async check() {
    const diag: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'pending',
    };
    try {
      await this.db.query('SELECT 1');
      diag.database = 'connected';
    } catch (err) {
      diag.database = 'error';
      diag.dbError = (err as Error).message;
    }
    return diag;
  }
}
