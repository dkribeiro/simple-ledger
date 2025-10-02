import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '../../data/transaction.repository';
import { Transaction } from '../../data/transaction.entity';
import { Account } from '../../../accounts/data/account.entity';

@Injectable()
export class ComputeBalanceService {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  /**
   * Computes the current balance of an account using event sourcing:
   * current_balance = closed_balance + sum(unreconciled_transactions)
   *
   * This prevents race conditions since the balance is never directly mutated,
   * only calculated from the immutable transaction history.
   *
   * @param account - The account entity (must be already fetched)
   * @returns The computed balance (closed_balance + unreconciled transactions)
   */
  execute(account: Account): number {
    // Get all unreconciled transactions for this account (where reconciled_at IS NULL)
    const unreconciledTransactions =
      this.transactionRepository.findUnreconciledByAccountId(account.id);

    // Compute balance: closed_balance + sum(unreconciled_transactions)
    return unreconciledTransactions.reduce(
      (balance, transaction) =>
        this.applyTransactionToBalance(balance, account.direction, transaction),
      account.closed_balance,
    );
  }

  /**
   * Apply a transaction to a balance based on account and transaction directions.
   * - Same direction: add to balance
   * - Different direction: subtract from balance
   */
  private applyTransactionToBalance(
    currentBalance: number,
    accountDirection: Transaction['direction'],
    transaction: Transaction,
  ): number {
    if (accountDirection === transaction.direction) {
      return currentBalance + transaction.amount;
    } else {
      return currentBalance - transaction.amount;
    }
  }
}
