import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@Req() req: any, @UploadedFile() file?: Express.Multer.File) {
    return this.documentsService.upload(req.user.companyId, file);
  }

  @Get()
  getDocuments(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.documentsService.getDocuments(
      req.user.companyId,
      Number(page) || 1,
      Math.min(Number(limit) || 50, 100),
    );
  }

  @Get(':id')
  async getDocument(@Req() req: any, @Param('id') id: string) {
    const doc = await this.documentsService.assertDocumentInCompany(id, req.user.companyId);
    const { file, ...rest } = doc;
    return rest;
  }

  @Get(':id/download')
  async download(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const doc = await this.documentsService.assertDocumentInCompany(id, req.user.companyId);
    if (!doc.file) {
      throw new BadRequestException('File not stored for this document');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.filename || doc.title)}"`);
    res.send(doc.file);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.delete(id, req.user.companyId);
  }

  @Post(':id/ask')
  ask(@Req() req: any, @Param('id') id: string, @Body('question') question: string) {
    return this.documentsService.ask(req.user.companyId, id, question);
  }

  @Post(':id/summarize')
  summarize(@Req() req: any, @Param('id') id: string, @Body('force') force?: boolean) {
    return this.documentsService.summarize(req.user.companyId, id, force === true);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body('published') published?: boolean) {
    if (typeof published !== 'boolean') {
      throw new BadRequestException('Only the published flag can be changed');
    }
    return this.documentsService.setPublished(id, req.user.companyId, published);
  }

  @Post(':id/reindex')
  reindex(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.reindex(req.user.companyId, id);
  }
}
