import { Module, forwardRef } from '@nestjs/common';
import { AccountRepository } from './data/account.repository';
import { CreateAccountService } from './use-cases/create-account/create-account.service';
import { CreateAccountController } from './use-cases/create-account/create-account.controller';
import { GetAccountService } from './use-cases/get-account/get-account.service';
import { GetAccountController } from './use-cases/get-account/get-account.controller';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [forwardRef(() => TransactionsModule)], // Use forwardRef to resolve circular dependency. In production we would use a separate module for the scheduler and this circular dependency would be resolved by a separate module. But for the sake of simplicity we are using the same module.
  providers: [AccountRepository, CreateAccountService, GetAccountService],
  controllers: [CreateAccountController, GetAccountController],
  exports: [AccountRepository], // Export so TransactionsModule can use it
})
export class AccountsModule {}
