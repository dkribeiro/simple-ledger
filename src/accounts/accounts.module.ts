import { Module } from '@nestjs/common';
import { AccountRepository } from './data/account.repository';
import { CreateAccountService } from './use-cases/create-account/create-account.service';
import { CreateAccountController } from './use-cases/create-account/create-account.controller';
import { GetAccountService } from './use-cases/get-account/get-account.service';
import { GetAccountController } from './use-cases/get-account/get-account.controller';
import { ReconcileAccountController } from './use-cases/reconcile-account/reconcile-account.controller';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [TransactionsModule], // Import to access ComputeBalanceService and ReconcileAccountService
  providers: [AccountRepository, CreateAccountService, GetAccountService],
  controllers: [
    CreateAccountController,
    GetAccountController,
    ReconcileAccountController,
  ],
  exports: [AccountRepository], // Export so TransactionsModule can use it
})
export class AccountsModule {}
