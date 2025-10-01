import { Injectable } from '@nestjs/common';
import { Transaction } from './transaction.entity';

@Injectable()
export class TransactionRepository {
  private transactions: Map<string, Transaction> = new Map();

  save(transaction: Transaction): Transaction {
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  findById(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  findAll(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  /**
   * Find all transaction lines for a specific transaction group
   */
  findByTransactionId(transactionId: string): Transaction[] {
    return this.findAll().filter(
      (transaction) => transaction.transaction_id === transactionId,
    );
  }

  /**
   * Find all transactions for a specific account
   */
  findByAccountId(accountId: string): Transaction[] {
    return this.findAll().filter(
      (transaction) => transaction.account_id === accountId,
    );
  }

  /**
   * Find unreconciled transactions for a specific account
   */
  findUnreconciledByAccountId(accountId: string): Transaction[] {
    return this.findAll().filter(
      (transaction) =>
        transaction.account_id === accountId &&
        transaction.reconciled_at === null,
    );
  }

  /**
   * Find all unreconciled transaction lines for a specific transaction group
   */
  findUnreconciledByTransactionId(transactionId: string): Transaction[] {
    return this.findAll().filter(
      (transaction) =>
        transaction.transaction_id === transactionId &&
        transaction.reconciled_at === null,
    );
  }

  /**
   * Mark all transaction lines in a group as reconciled
   */
  reconcileTransactionGroup(transactionId: string, reconciledAt: Date): void {
    const transactions = this.findByTransactionId(transactionId);
    transactions.forEach((transaction) => {
      transaction.reconciled_at = reconciledAt;
    });
  }

  /**
   * Get all unique transaction group IDs
   */
  getAllTransactionIds(): string[] {
    const transactionIds = new Set(
      this.findAll().map((transaction) => transaction.transaction_id),
    );
    return Array.from(transactionIds);
  }

  /**
   * Get all unique unreconciled transaction group IDs
   */
  getUnreconciledTransactionIds(): string[] {
    const transactionIds = new Set(
      this.findAll()
        .filter((transaction) => transaction.reconciled_at === null)
        .map((transaction) => transaction.transaction_id),
    );
    return Array.from(transactionIds);
  }
}
