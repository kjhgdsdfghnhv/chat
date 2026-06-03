import { Controller, Post, UploadedFile, UseInterceptors, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as fs from 'fs';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor() {
    const uploadDir = join(process.cwd(), 'uploads', 'messages');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = join(process.cwd(), 'uploads', 'messages');
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `file-${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body('chatId') chatId: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const fileType = file.mimetype.split('/')[0];
    let messageText = '';
    if (fileType === 'image') messageText = `📷 Зображення: ${file.originalname}`;
    else if (fileType === 'video') messageText = `🎥 Відео: ${file.originalname}`;
    else messageText = `📎 Файл: ${file.originalname}`;

    return {
      messageUrl: `/uploads/messages/${file.filename}`,
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      messageText: messageText
    };
  }
}