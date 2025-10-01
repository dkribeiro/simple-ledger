import { Injectable, NotFoundException } from '@nestjs/common';
import { Account } from './account.entity';

@Injectable()
export class AccountRepository {
  private accounts: Map<string, Account> = new Map();

  save(account: Account): Account {
    this.accounts.set(account.id, account);
    return account;
  }

  findById(id: string): Account | undefined {
    return this.accounts.get(id);
  }

  findByIdOrFail(id: string): Account {
    const account = this.findById(id);
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  updateBalance(id: string, newBalance: number): void {
    const account = this.findByIdOrFail(id);
    account.balance = newBalance;
  }
}
