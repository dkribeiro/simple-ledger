import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionRepository } from '../../data/transaction.repository';
import { CreateTransactionDto } from '../../data/create-transaction.dto';
import { Transaction } from '../../data/transaction.entity';
import { Entry } from '../../data/entry.entity';
import { AccountRepository } from '../../../accounts/data/account.repository';

@Injectable()
export class CreateTransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountRepository: AccountRepository,
  ) {}

  execute(dto: CreateTransactionDto): Transaction {
    // 1. Validate: Check that debits and credits balance to zero
    this.validateBalance(dto);

    // 2. Fetch & Validate: Ensure all accounts exist
    const accounts = dto.entries.map((entryDto) =>
      this.accountRepository.findByIdOrFail(entryDto.account_id),
    );

    // 3. Calculate: Compute new balances for affected accounts
    const newBalances = dto.entries.map((entryDto, index) => {
      const account = accounts[index];
      const currentBalance = account.balance;
      const newBalance = this.calculateNewBalance(
        currentBalance,
        account.direction,
        entryDto.direction,
        entryDto.amount,
      );
      return { accountId: account.id, newBalance };
    });

    // 4. Commit: Save transaction and update all account balances
    const entries = dto.entries.map(
      (entryDto) =>
        new Entry({
          id: entryDto.id,
          account_id: entryDto.account_id,
          amount: entryDto.amount,
          direction: entryDto.direction,
        }),
    );

    const transaction = new Transaction({
      id: dto.id,
      name: dto.name,
      entries,
    });

    // Save transaction
    const savedTransaction = this.transactionRepository.save(transaction);

    // Update all account balances
    newBalances.forEach(({ accountId, newBalance }) => {
      this.accountRepository.updateBalance(accountId, newBalance);
    });

    return savedTransaction;
  }

  private validateBalance(dto: CreateTransactionDto): void {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of dto.entries) {
      if (entry.direction === 'debit') {
        totalDebits += entry.amount;
      } else {
        totalCredits += entry.amount;
      }
    }

    if (totalDebits !== totalCredits) {
      throw new BadRequestException(
        `Transaction is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`,
      );
    }
  }

  private calculateNewBalance(
    currentBalance: number,
    accountDirection: 'debit' | 'credit',
    entryDirection: 'debit' | 'credit',
    entryAmount: number,
  ): number {
    // If directions match, add; if they differ, subtract
    if (accountDirection === entryDirection) {
      return currentBalance + entryAmount;
    } else {
      return currentBalance - entryAmount;
    }
  }
}
