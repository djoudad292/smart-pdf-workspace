import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { GuestService } from './guest.service';
import { GuestGuard } from './guest.guard';

/**
 * Public demo surface. No registration, no shared account: every call is
 * scoped to the sandbox company carried by the guest token, with a TTL, an
 * upload quota and a per-file size cap.
 */
@Controller('guest')
export class GuestController {
  constructor(private guestService: GuestService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('session')
  createSession() {
    return this.guestService.createSession();
  }

  @UseGuards(GuestGuard)
  @Post('session/end')
  async endSession(@Req() req: any) {
    return this.guestService.endSession(req.user.companyId);
  }

  @UseGuards(GuestGuard)
  @Get('documents')
  listDocuments(@Req() req: any) {
    return this.guestService.listDocuments(req.user.companyId);
  }

  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(@Req() req: any, @UploadedFile() file?: Express.Multer.File) {
    return this.guestService.upload(req.user.companyId, file);
  }

  @UseGuards(GuestGuard)
  @Delete('documents/:id')
  removeDocument(@Req() req: any, @Param('id') id: string) {
    return this.guestService.removeDocument(req.user.companyId, id);
  }

  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('documents/:id/summarize')
  summarize(@Req() req: any, @Param('id') id: string) {
    return this.guestService.summarize(req.user.companyId, id);
  }

  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('ask')
  ask(@Req() req: any, @Body('question') question: string) {
    return this.guestService.ask(req.user.companyId, question);
  }
}
