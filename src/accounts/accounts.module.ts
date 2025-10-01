import { Module } from '@nestjs/common';
import { AccountRepository } from './data/account.repository';
import { CreateAccountService } from './use-cases/create-account/create-account.service';
import { CreateAccountController } from './use-cases/create-account/create-account.controller';
import { GetAccountService } from './use-cases/get-account/get-account.service';
import { GetAccountController } from './use-cases/get-account/get-account.controller';

@Module({
  providers: [AccountRepository, CreateAccountService, GetAccountService],
  controllers: [CreateAccountController, GetAccountController],
  exports: [AccountRepository],
})
export class AccountsModule {}
