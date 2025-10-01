import { v4 as uuidv4 } from 'uuid';

export type EntryDirection = 'debit' | 'credit';

export class Entry {
  id: string;
  account_id: string;
  amount: number; // Stored as integer (cents)
  direction: EntryDirection;

  constructor(partial: Partial<Entry>) {
    this.id = partial.id || uuidv4();
    this.account_id = partial.account_id!;
    this.amount = partial.amount!;
    this.direction = partial.direction!;
  }
}
