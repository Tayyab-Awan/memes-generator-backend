import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { Env } from './shared/config/env.schema';
import { docsBasicAuth } from './shared/docs/docs-basic-auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );
  app.enableShutdownHooks();

  const docsUser = config.get('DOCS_USER', { infer: true });
  const docsPassword = config.get('DOCS_PASSWORD', { infer: true });
  if (docsUser && docsPassword) {
    app.use(
      ['/docs', '/docs-json', '/docs-yaml'],
      docsBasicAuth(docsUser, docsPassword),
    );
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Meme Generator API')
      .setVersion('1.0')
      .build();
    SwaggerModule.setup(
      'docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
