import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true })
  chatId: string;

  @Prop({ required: true })
  senderId: string;

  // Робимо text необов'язковим – дозволяємо порожній рядок
  @Prop({ required: false, default: '' })
  text: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  fileUrl?: string;

  @Prop()
  fileType?: string;

  @Prop()
  fileName?: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);