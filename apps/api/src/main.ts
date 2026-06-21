import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { SentryExceptionFilter } from './monitoring/sentry.filter';
import { initSentry } from './monitoring/sentry';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(AppConfigService);

  initSentry({
    NODE_ENV: config.get('NODE_ENV'),
    SENTRY_DSN: config.get('SENTRY_DSN'),
    SENTRY_TRACES_SAMPLE_RATE: config.get('SENTRY_TRACES_SAMPLE_RATE'),
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new SentryExceptionFilter());
  app.enableShutdownHooks();

  const port = config.get('PORT');
  await app.listen(port);
  new Logger('Bootstrap').log(`rahi-api listening on :${port} (${config.get('NODE_ENV')})`);
}

void bootstrap();
