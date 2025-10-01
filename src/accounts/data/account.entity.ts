import { v4 as uuidv4 } from 'uuid';

export type AccountDirection = 'debit' | 'credit';

export class Account {
  id: string;
  name?: string;
  direction: AccountDirection;

  // Event-sourced balance: Instead of storing a mutable balance,
  // we maintain a "closed" snapshot and calculate the current balance
  // from the closed balance + unreconciled transactions
  closed_balance: number; // Snapshot of balance from reconciled transactions (cents)

  // Optimistic locking: Version is incremented on each update to prevent race conditions
  version: number; // Incremented atomically on each closed_balance update

  constructor(partial: Partial<Account>) {
    this.id = partial.id || uuidv4();
    this.name = partial.name;
    this.direction = partial.direction!;
    this.closed_balance = partial.closed_balance ?? 0;
    this.version = partial.version ?? 0;
  }
}
