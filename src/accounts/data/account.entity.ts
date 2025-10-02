import { v4 as uuidv4 } from 'uuid';
import { Direction } from '../../transactions/shared/direction.type';

export class Account {
  id: string;
  name?: string;
  direction: Direction;
  closed_balance: number; // Snapshot from reconciled transactions (cents)
  version: number; // Optimistic locking for concurrent updates

  constructor(partial: Partial<Account>) {
    this.id = partial.id || uuidv4();
    this.name = partial.name;
    this.direction = partial.direction!;
    this.closed_balance = partial.closed_balance ?? 0;
    this.version = partial.version ?? 0;
  }
}
