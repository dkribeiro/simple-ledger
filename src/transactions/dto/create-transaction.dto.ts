import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Direction } from '../shared/direction.type';

export class CreateTransactionLineDto {
  @ApiPropertyOptional({
    description:
      'Unique identifier for the transaction line (UUID v4). If not provided, one will be generated.',
    example: 'a5c1b7f0-e52e-4ab6-8f31-c380c2223efa',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    description: 'ID of the account this transaction line affects',
    example: 'fa967ec9-5be2-4c26-a874-7eeeabfc6da8',
  })
  @IsUUID()
  account_id!: string;

  @ApiProperty({
    description: 'Amount in cents (integer). Must be at least 1 cent.',
    example: 10000,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  amount!: number; // Integer (cents)

  @ApiProperty({
    description: 'Transaction direction. Debit or credit.',
    enum: ['debit', 'credit'],
    example: 'debit',
  })
  @IsIn(['debit', 'credit'])
  direction!: Direction;
}

export class CreateTransactionDto {
  @ApiPropertyOptional({
    description:
      'Unique identifier for the transaction (UUID v4). If not provided, one will be generated.',
    example: '3256dc3c-7b18-4a21-95c6-146747cf2971',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({
    description: 'Human-readable description of the transaction',
    example: 'Payment for services',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description:
      'Array of transaction lines. Must have at least 2 entries and balance (sum of debits = sum of credits).',
    type: [CreateTransactionLineDto],
    minItems: 2,
    example: [
      {
        direction: 'debit',
        account_id: 'fa967ec9-5be2-4c26-a874-7eeeabfc6da8',
        amount: 10000,
      },
      {
        direction: 'credit',
        account_id: 'dbf17d00-8701-4c4e-9fc5-6ae33c324309',
        amount: 10000,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionLineDto)
  entries!: CreateTransactionLineDto[];
}
