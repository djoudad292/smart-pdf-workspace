import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StoreService } from '../common/store.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private store: StoreService) {}

  @Get()
  async getAnalytics(@Req() req: any) {
    const companyId = req.user.companyId;
    const [documents, users, chunks, asks, asksToday, byDay, recent] = await Promise.all([
      this.store.findDocumentsByCompany(companyId, 1, 1000),
      this.store.countUsersByCompany(companyId),
      this.store.countChunksByCompany(companyId),
      this.store.countAsksByCompany(companyId),
      this.store.countAsksToday(companyId),
      this.store.getAsksByDay(companyId, 14),
      this.store.getRecentAsks(companyId, 10),
    ]);

    const docs = documents.items;
    const totalSize = docs.reduce((sum, d) => sum + (d.sizeBytes || 0), 0);

    return {
      summary: {
        documents: docs.length,
        readyDocuments: docs.filter((d) => d.status === 'ready').length,
        publishedDocuments: docs.filter((d) => d.published).length,
        processingDocuments: docs.filter((d) => d.status === 'processing').length,
        failedDocuments: docs.filter((d) => d.status === 'failed').length,
        chunks,
        teamMembers: users,
        totalSizeBytes: totalSize,
        totalQuestions: asks,
        questionsToday: asksToday,
      },
      asksByDay: byDay,
      recentAsks: recent.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    };
  }
}
