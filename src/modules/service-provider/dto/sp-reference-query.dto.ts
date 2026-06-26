import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard response every external SP must return from
 *   GET {referenceQueryUrl}/api/v1/sp/references/{referenceNumber}
 *
 * This is the published UCG contract — all SPs conform to it, which is what
 * lets a single generic client serve every SP with config only (no per-SP code).
 */
export class SpReferenceQueryResultDto {
  @ApiProperty({ description: 'Whether the SP recognised and accepted the reference' })
  isValid: boolean;

  @ApiProperty({ description: 'The reference number that was queried' })
  referenceNumber: string;

  @ApiProperty({ description: 'spCode of the service provider that owns the reference' })
  spCode: string;

  @ApiProperty({ description: 'Customer / payer name', required: false })
  customerName?: string;

  @ApiProperty({ description: 'Amount due', required: false })
  amount?: number;

  @ApiProperty({ description: 'Bill / payment description', required: false })
  description?: string;

  @ApiProperty({ description: 'Status reported by the SP, if any', required: false })
  status?: string;

  @ApiProperty({ description: 'Raw payload returned by the SP', required: false })
  raw?: any;
}
