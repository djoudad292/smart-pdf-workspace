import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger as PinoLogger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/exception.filter';
import { DatabaseService } from './common/database.service';
import { StoreService } from './common/store.service';
import { AIService } from './ai/ai.service';
import { seedDemoData } from './common/demo.seed';

async function buildApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));
  // `bufferLogs: true` parks every `new Logger(...)` call in an in-memory
  // buffer. Nest only auto-flushes that buffer from app.listen()'s callback,
  // and app.listen() never runs on Vercel serverless — so without this line the
  // serverless build silently drops every application log (including the
  // embeddings startup line and the EMBEDDINGS_DEGRADED / RETRIEVAL_DEGRADED
  // markers). Flushing here covers both the Vercel and the listen() paths.
  app.flushLogs();
  const logger = new Logger('Bootstrap');

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: false,
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Smart PDF Workspace API')
    .setDescription('The Smart PDF Workspace Platform API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const db = app.get(DatabaseService);
  await db.initialize();

  const store = app.get(StoreService);
  const ai = app.get(AIService);
  await seedDemoData(store, ai);

  await app.init();
  return app;
}

// Cached handler for serverless (Vercel): cold start builds once per instance.
let cachedHandler: ((req: unknown, res: unknown) => void) | null = null;

export async function getHandler() {
  if (!cachedHandler) {
    const app = await buildApp();
    cachedHandler = app.getHttpAdapter().getInstance();
  }
  return cachedHandler;
}

// Long-running hosts (Render/local): listen. Vercel uses api/index.ts instead.
if (!process.env.VERCEL) {
  const port = process.env.PORT || 4000;
  buildApp()
    .then(async (app) => {
      await app.listen(port, '0.0.0.0');
      new Logger('Bootstrap').log(`Application is running on: http://0.0.0.0:${port}`);
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}
