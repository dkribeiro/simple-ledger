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
}
