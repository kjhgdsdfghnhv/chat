import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as fs from 'fs';
import * as express from 'express';

async function bootstrap() {
  // Создаем папки ДО создания приложения (multer их может использовать)
  const uploadsDir = join(process.cwd(), 'uploads', 'avatars');
  const messagesDir = join(process.cwd(), 'uploads', 'messages');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`✓ Created directory: ${uploadsDir}`);
  }
  if (!fs.existsSync(messagesDir)) {
    fs.mkdirSync(messagesDir, { recursive: true });
    console.log(`✓ Created directory: ${messagesDir}`);
  }

  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*', credentials: true });
  app.setGlobalPrefix('api');
  
  // Служим загруженные файлы
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  console.log(`✓ Static files served from: ${join(process.cwd(), 'uploads')}`);
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();
