import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../data/account.repository';
import { Account } from '../../data/account.entity';

@Injectable()
export class GetAccountService {
  constructor(private readonly accountRepository: AccountRepository) {}

  execute(id: string): Account {
    return this.accountRepository.findByIdOrFail(id);
  }
}
