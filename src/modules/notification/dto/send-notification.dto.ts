import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum NotificationType {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  recepient: string; // Note: Using same spelling as API (recepient instead of recipient)

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  sender?: string; // For EMAIL type
}
