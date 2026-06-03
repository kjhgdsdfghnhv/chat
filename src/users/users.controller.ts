import { Controller, Get, Post, Delete, Param, Query, Request, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private logger = new Logger('UsersController');
  
  constructor(private usersService: UsersService) {}

  @Get('search')
  search(@Query('q') query: string, @Request() req) {
    return this.usersService.searchByUsername(query, req.user._id.toString());
  }

  @Get('contacts')
  getContacts(@Request() req) {
    return this.usersService.getContacts(req.user._id.toString());
  }

  @Post('contacts/:id')
  addContact(@Param('id') contactId: string, @Request() req) {
    return this.usersService.addContact(req.user._id.toString(), contactId);
  }

  @Delete('contacts/:id')
  removeContact(@Param('id') contactId: string, @Request() req) {
    return this.usersService.removeContact(req.user._id.toString(), contactId);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      this.logger.error('❌ No file received');
      throw new BadRequestException('No file uploaded');
    }
    
    this.logger.log(`✓ File received: ${file.originalname}`);
    this.logger.log(`✓ File path: ${file.path}`);
    this.logger.log(`✓ File size: ${file.size} bytes`);
    
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    this.logger.log(`✓ Avatar URL: ${avatarUrl}`);
    
    const result = await this.usersService.updateAvatar(req.user._id.toString(), avatarUrl);
    return result;
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
