import { v4 as uuidv4 } from 'uuid';
import { Direction } from '../shared/direction.type';

/**
 * Transaction line in the ledger.
 * Denormalized: Multiple lines with same transaction_id form one double-entry transaction.
 */
export class Transaction {
  id: string;
  account_id: string;
  amount: number; // Integer (cents)
  direction: Direction;

  transaction_id: string; // Groups lines into transactions
  transaction_name?: string;
  created_at: Date;
  reconciled_at: Date | null;

  constructor(partial: Partial<Transaction>) {
    this.id = partial.id || uuidv4();
    this.account_id = partial.account_id!;
    this.amount = partial.amount!;
    this.direction = partial.direction!;

    // Transaction group metadata
    this.transaction_id = partial.transaction_id!;
    this.transaction_name = partial.transaction_name;
    this.created_at = partial.created_at || new Date();
    this.reconciled_at = partial.reconciled_at ?? null;
  }
}
