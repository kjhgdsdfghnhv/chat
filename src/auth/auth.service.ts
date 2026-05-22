import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(username: string, email: string, password: string) {
    const existingUser = await this.userModel.findOne({ $or: [{ email }, { username }] });
    if (existingUser) throw new ConflictException('User already exists');
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new this.userModel({ username, email, password: hashedPassword });
    await user.save();
    const token = this.jwtService.sign({ sub: user._id, username: user.username });
    return { token, user: { _id: user._id, username, email, avatar: user.avatar } };
  }

  async login(email: string, password: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');
    const token = this.jwtService.sign({ sub: user._id, username: user.username });
    return { token, user: { _id: user._id, username: user.username, email: user.email, avatar: user.avatar } };
  }

  async validateUser(userId: string) {
    return this.userModel.findById(userId).select('-password');
  }
}
