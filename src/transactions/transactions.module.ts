import { Module, forwardRef } from '@nestjs/common';
import { TransactionRepository } from './data/transaction.repository';
import { CreateTransactionService } from './use-cases/create-transaction/create-transaction.service';
import { CreateTransactionController } from './use-cases/create-transaction/create-transaction.controller';
import { ComputeBalanceService } from './use-cases/compute-balance/compute-balance.service';
import { ReconciliationService } from './use-cases/reconciliation/reconciliation.service';
import { ReconciliationController } from './use-cases/reconciliation/reconciliation.controller';
import { ReconciliationScheduler } from './use-cases/reconciliation/reconciliation.scheduler';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [forwardRef(() => AccountsModule)], // Use forwardRef to resolve circular dependency, in production we would use a separate module for the scheduler and this circular dependency would be resolved by a separate module. But for the sake of simplicity we are using the same module.
  providers: [
    TransactionRepository, // Single repository for denormalized transactions
    CreateTransactionService,
    ComputeBalanceService,
    ReconciliationService, // System-wide reconciliation of all transactions
    ReconciliationScheduler, // Automatic hourly reconciliation (cron)
  ],
  controllers: [
    CreateTransactionController,
    ReconciliationController, // Single endpoint for system-wide reconciliation
  ],
  exports: [
    TransactionRepository,
    ComputeBalanceService, // Export so AccountsModule can use it
  ],
})
export class TransactionsModule {}
