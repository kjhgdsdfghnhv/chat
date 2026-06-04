import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true })
  chatId: string;

  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true })
  text: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  isRead: boolean;

  // NEW fields for files/images
  @Prop()
  fileUrl?: string;

  @Prop()
  fileType?: string;

  @Prop()
  fileName?: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);