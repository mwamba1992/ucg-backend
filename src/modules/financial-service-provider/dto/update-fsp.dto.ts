import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateFspDto } from './create-fsp.dto';

export class UpdateFspDto extends PartialType(
  OmitType(CreateFspDto, ['fspCode'] as const),
) {}
