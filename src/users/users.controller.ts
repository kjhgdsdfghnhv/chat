import { Controller, Get, Post, Delete, Param, Query, Request, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
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
  uploadAvatar(@UploadedFile() file: Express.Multer.File, @Request() req) {
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    return this.usersService.updateAvatar(req.user._id.toString(), avatarUrl);
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
