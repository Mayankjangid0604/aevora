import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  try {
    const path = require('path');
    process.loadEnvFile(path.join(process.cwd(), '../../.env'));
  } catch (e) {
    console.warn('Could not load .env file from root', e.message);
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  const app = await NestFactory.create(AppModule, { rawBody: true });
  
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') 
      : ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  });
  
  const port = process.env.PORT || 13000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();

