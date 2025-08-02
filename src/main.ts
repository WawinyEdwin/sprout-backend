import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.ALLOWED_ORIGIN || 'https://sproutai-beta.vercel.app/',
    credentials: true,
  });

  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 9000);
}
bootstrap();
