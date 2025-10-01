import { v4 as uuidv4 } from 'uuid';

export type AccountDirection = 'debit' | 'credit';

export class Account {
  id: string;
  name?: string;
  balance: number; // Stored as integer (cents)
  direction: AccountDirection;

  constructor(partial: Partial<Account>) {
    this.id = partial.id || uuidv4();
    this.name = partial.name;
    this.balance = partial.balance ?? 0;
    this.direction = partial.direction!;
  }
}
