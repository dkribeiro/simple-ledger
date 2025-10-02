import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  /**
   * Update closed balance with optimistic locking (version check).
   */
  updateClosedBalance(
    id: string,
    newClosedBalance: number,
    expectedVersion: number,
  ): void {
    const account = this.findByIdOrFail(id);

    if (account.version !== expectedVersion) {
      throw new ConflictException(
        `Account ${id} was modified by another operation. ` +
          `Expected version ${expectedVersion}, found ${account.version}. ` +
          `Retry the operation.`,
      );
    }

    account.closed_balance = newClosedBalance;
    account.version = expectedVersion + 1;
  }
}
