import { Injectable } from '@nestjs/common';
import { Transaction } from './transaction.entity';

/**
 * TransactionRepository - In-Memory Implementation
 *
 * This is a simple in-memory repository for development/testing.
 * In a production database implementation, you would need:
 *
 * 1. **ORM/Query Builder**: Use TypeORM, Prisma, or similar
 * 2. **Database Indexes**: Critical for performance
 *    - PRIMARY KEY on `id`
 *    - INDEX on `transaction_id` (for grouping transaction lines)
 *    - INDEX on `account_id` (for account queries)
 *    - INDEX on `reconciled_at` (for filtering unreconciled)
 *    - COMPOSITE INDEX on (`account_id`, `reconciled_at`) for balance queries
 *
 * 3. **Connection Pooling**: Manage database connections efficiently
 * 4. **Query Optimization**: Use WHERE clauses instead of in-memory filtering
 * 5. **Pagination**: Never return all records, use LIMIT/OFFSET or cursor-based
 * 6. **Transactions**: Wrap operations in database transactions for atomicity
 * 7. **Prepared Statements**: Prevent SQL injection, improve performance
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

  findAll(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  findByTransactionId(transactionId: string): Transaction[] {
    return this.findAll().filter(
      (t) => t.transaction_id === transactionId,
    );
  }

  findByAccountId(accountId: string): Transaction[] {
    return this.findAll().filter((t) => t.account_id === accountId);
  }

  /**
   * CRITICAL: This is called on EVERY account GET request for balance calculation.
   * Returns only unreconciled transactions for the given account.
   *
   * DATABASE: SELECT * FROM transactions
   *           WHERE account_id = $1 AND reconciled_at IS NULL
   *           (requires composite index on account_id, reconciled_at)
   */
  findUnreconciledByAccountId(accountId: string): Transaction[] {
    return this.findAll().filter(
      (t) => t.account_id === accountId && t.reconciled_at === null,
    );
  }

  reconcileTransactionGroup(transactionId: string, reconciledAt: Date): void {
    this.findByTransactionId(transactionId).forEach((t) => {
      t.reconciled_at = reconciledAt;
    });
  }

  getAllTransactionIds(): string[] {
    return [...new Set(this.findAll().map((t) => t.transaction_id))];
  }

  getUnreconciledTransactionIds(): string[] {
    return [
      ...new Set(
        this.findAll()
          .filter((t) => t.reconciled_at === null)
          .map((t) => t.transaction_id),
      ),
    ];
  }
}
