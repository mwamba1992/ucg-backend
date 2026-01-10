import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IdType } from '../entities/service-provider-contact.entity';

export class CreateContactDto {
  @ApiProperty({
    description: 'Contact person full name',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  fullName: string;

  @ApiProperty({
    description: 'Contact person phone number',
    example: '+255712345678',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  phoneNumber: string;

  @ApiProperty({
    description: 'Contact person email',
    example: 'john.doe@mwangaschool.co.tz',
  })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({
    description: 'Type of identification document',
    enum: IdType,
    example: IdType.NIDA,
  })
  @IsNotEmpty()
  @IsEnum(IdType)
  idType: IdType;

  @ApiProperty({
    description: 'Identification number',
    example: '19901231-12345-67890-12',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  idNumber: string;

  @ApiPropertyOptional({
    description: 'Job title or position',
    example: 'Head Teacher',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;
}
