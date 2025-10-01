import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateTransactionService } from './create-transaction.service';
import { CreateTransactionDto } from '../../dto/create-transaction.dto';

@ApiTags('transactions')
@Controller('transactions')
export class CreateTransactionController {
  constructor(
    private readonly createTransactionService: CreateTransactionService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new transaction',
    description:
      'Creates a transaction with multiple entries following double-entry bookkeeping principles. ' +
      'The sum of debits must equal the sum of credits. ' +
      'All monetary values are in cents (integers).',
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction successfully created',
    schema: {
      example: {
        id: '3256dc3c-7b18-4a21-95c6-146747cf2971',
        name: 'Payment for services',
        entries: [
          {
            id: 'a5c1b7f0-e52e-4ab6-8f31-c380c2223efa',
            account_id: 'fa967ec9-5be2-4c26-a874-7eeeabfc6da8',
            amount: 10000,
            direction: 'debit',
          },
          {
            id: 'b6d2c8e1-f53f-5bc7-9g42-d491d3334fgb',
            account_id: 'dbf17d00-8701-4c4e-9fc5-6ae33c324309',
            amount: 10000,
            direction: 'credit',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid transaction (debits != credits or account not found)',
  })
  create(@Body() dto: CreateTransactionDto) {
    const { id, name, entries } = this.createTransactionService.execute(dto);

    // Return in the expected API format
    return {
      id,
      name,
      entries: entries.map((entry) => ({
        id: entry.id,
        account_id: entry.account_id,
        amount: entry.amount,
        direction: entry.direction,
      })),
    };
  }
}
