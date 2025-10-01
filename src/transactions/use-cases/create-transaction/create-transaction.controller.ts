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
    return this.createTransactionService.execute(dto);
  }
}
