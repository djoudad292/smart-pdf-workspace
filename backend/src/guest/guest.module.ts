import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GuestController } from './guest.controller';
import { GuestService } from './guest.service';
import { GuestGuard } from './guest.guard';
import { DocumentsModule } from '../documents/documents.module';
import { AIModule } from '../ai/ai.module';
import { JWT_SECRET } from '../common/config';

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET(),
      signOptions: { expiresIn: '2h' },
    }),
    DocumentsModule,
    AIModule,
  ],
  controllers: [GuestController],
  providers: [GuestService, GuestGuard],
})
export class GuestModule {}
