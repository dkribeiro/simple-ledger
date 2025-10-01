import { Module } from '@nestjs/common';
import { TransactionRepository } from './data/transaction.repository';
import { CreateTransactionService } from './use-cases/create-transaction/create-transaction.service';
import { CreateTransactionController } from './use-cases/create-transaction/create-transaction.controller';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [AccountsModule],
  providers: [TransactionRepository, CreateTransactionService],
  controllers: [CreateTransactionController],
})
export class TransactionsModule {}
