import { Injectable } from '@nestjs/common';
import { Transaction } from './transaction.entity';

/**
 * In-memory transaction repository.
 *
 * Production database would need:
 * - Indexes on: id, transaction_id, account_id, reconciled_at, (account_id, reconciled_at)
 * - Connection pooling, query optimization, pagination
 * - DB transactions for atomicity, prepared statements
 */
@Injectable()
export class TransactionRepository {
  private transactions: Map<string, Transaction> = new Map();

  save(transaction: Transaction): Transaction {
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  delete(id: string): void {
    this.transactions.delete(id);
  }

  private findBy(predicate: (t: Transaction) => boolean): Transaction[] {
    return Array.from(this.transactions.values()).filter(predicate);
  }

  findByTransactionId(transactionId: string): Transaction[] {
    return this.findBy((t) => t.transaction_id === transactionId);
  }

  findByAccountId(accountId: string): Transaction[] {
    return this.findBy((t) => t.account_id === accountId);
  }

  /**
   * CRITICAL: Called on every account GET request for balance calculation.
   * DATABASE: WHERE account_id = $1 AND reconciled_at IS NULL
   *           (requires composite index on account_id, reconciled_at)
   */
  findUnreconciledByAccountId(accountId: string): Transaction[] {
    return this.findBy(
      (t) => t.account_id === accountId && t.reconciled_at === null,
    );
  }

  reconcileTransactionGroup(transactionId: string, reconciledAt: Date): void {
    this.findByTransactionId(transactionId).forEach((t) => {
      t.reconciled_at = reconciledAt;
    });
  }

  getAllTransactionIds(): string[] {
    return [
      ...new Set(
        Array.from(this.transactions.values()).map((t) => t.transaction_id),
      ),
    ];
  }

  getUnreconciledTransactionIds(): string[] {
    return [
      ...new Set(
        this.findBy((t) => t.reconciled_at === null).map(
          (t) => t.transaction_id,
        ),
      ),
    ];
  }
}
