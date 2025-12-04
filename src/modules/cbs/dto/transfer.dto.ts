import { IsString, IsNumber, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum TransferType {
  GL_TO_DEPOSIT = 'GL_TO_DEPOSIT',
  DEPOSIT_TO_GL = 'DEPOSIT_TO_GL',
  GL_TO_GL = 'GL_TO_GL',
  DEPOSIT_TO_DEPOSIT = 'DEPOSIT_TO_DEPOSIT',
}

export class CreateTransferDto {
  @IsString()
  @IsNotEmpty()
  reference: string;

  @IsString()
  @IsNotEmpty()
  creditAccount: string;

  @IsString()
  @IsNotEmpty()
  debitAccount: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(TransferType)
  @IsNotEmpty()
  type: TransferType;
}

export class TransferResponseDto {
  statusDescription: string;
  statusCode: string;
  response: {
    message: string;
    amount: number;
    reference: string;
  };
}
