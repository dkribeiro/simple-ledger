import { Body, Controller, Post } from '@nestjs/common';
import { CreateTransactionService } from './create-transaction.service';
import { CreateTransactionDto } from '../../data/create-transaction.dto';

@Controller('transactions')
export class CreateTransactionController {
  constructor(
    private readonly createTransactionService: CreateTransactionService,
  ) {}

  @Post()
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
