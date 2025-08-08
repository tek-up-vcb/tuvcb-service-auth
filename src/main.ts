import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'http://app.localhost'],
    credentials: true,
  });

  // Enable global validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Don't set global prefix since Traefik strips /api
  // app.setGlobalPrefix('api/auth');

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Auth service is running on: http://localhost:${port}`);
}
bootstrap();
