import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { EmbeddingsService } from './embeddings.service';

@Module({
  providers: [AIService, EmbeddingsService],
  exports: [AIService, EmbeddingsService],
})
export class AIModule {}
