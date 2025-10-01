import {
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

export class CreateTransactionLineDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  account_id!: string;

  @IsInt()
  @Min(1)
  amount!: number; // Integer (cents)

  @IsIn(['debit', 'credit'])
  direction!: 'debit' | 'credit';
}

export class CreateTransactionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionLineDto)
  entries!: CreateTransactionLineDto[];
}
