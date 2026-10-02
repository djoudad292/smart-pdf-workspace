import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DatabaseService } from '../common/database.service';
import { EmbeddingsService } from '../ai/embeddings.service';

@Controller()
@SkipThrottle({ global: true, strict: true })
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  /**
   * Public, unauthenticated embeddings health. Answers the only question that
   * matters when retrieval looks wrong: was this answer served by real semantic
   * vectors, or by a degraded path?
   */
  @Get('health/embeddings')
  embeddingsHealth() {
    return this.embeddings.snapshot();
  }

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
