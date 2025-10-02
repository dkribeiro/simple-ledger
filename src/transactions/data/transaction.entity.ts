import { v4 as uuidv4 } from 'uuid';
import { Direction } from '../shared/direction.type';

/**
 * Transaction represents a single line in the ledger (a journal entry).
 *
 * Denormalized structure: Multiple transactions with the same transaction_id
 * form a complete double-entry transaction (which must balance to zero).
 */
export class Transaction {
  // Transaction line-specific fields
  id: string;
  account_id: string;
  amount: number; // Stored as integer (cents)
  direction: Direction;

  // Transaction group metadata (denormalized for simplicity)
  transaction_id: string; // Grouping identifier - all lines with same ID form one transaction
  transaction_name?: string; // Optional label for the transaction group
  created_at: Date; // When the transaction was created
  reconciled_at: Date | null; // When reconciled (null = unreconciled)

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
