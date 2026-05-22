import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatDocument = Chat & Document;

@Schema({ timestamps: true })
export class Chat {
  @Prop({ required: true, enum: ['private', 'group'] })
  type: string;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  avatar: string;

  @Prop({ type: [String], required: true })
  members: string[];

  @Prop({ type: String })
  adminId: string;

  @Prop({ type: Object })
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: Date;
  };
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
