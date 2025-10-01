import { Module } from '@nestjs/common';
import { TransactionRepository } from './data/transaction.repository';
import { CreateTransactionService } from './use-cases/create-transaction/create-transaction.service';
import { CreateTransactionController } from './use-cases/create-transaction/create-transaction.controller';
import { ComputeBalanceService } from './use-cases/compute-balance/compute-balance.service';
import { ReconcileAccountService } from './use-cases/reconcile-account/reconcile-account.service';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [AccountsModule], // Import AccountsModule to access AccountRepository
  providers: [
    TransactionRepository, // Single repository for denormalized transactions
    CreateTransactionService,
    ComputeBalanceService,
    ReconcileAccountService,
  ],
  controllers: [CreateTransactionController],
  exports: [
    TransactionRepository,
    ComputeBalanceService, // Export so AccountsModule controllers can use it
    ReconcileAccountService, // Export so AccountsModule controllers can use it
  ],
})
export class TransactionsModule {}
