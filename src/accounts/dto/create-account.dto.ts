import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Direction } from '../../transactions/shared/direction.type';

export class CreateAccountDto {
  @ApiPropertyOptional({
    description:
      'Unique identifier for the account (UUID v4). If not provided, one will be generated.',
    example: '71cde2aa-b9bc-496a-a6f1-34964d05e6fd',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({
    description: 'Human-readable name for the account',
    example: 'Cash Account',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description:
      'Account direction/type. Debit accounts increase with debits, credit accounts increase with credits.',
    enum: ['debit', 'credit'],
    example: 'debit',
  })
  @IsIn(['debit', 'credit'])
  direction!: Direction;
}
