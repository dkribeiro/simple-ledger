import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateAccountDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  closed_balance?: number; // Integer (cents) - initial closed balance

  @IsIn(['debit', 'credit'])
  direction!: 'debit' | 'credit';
}
