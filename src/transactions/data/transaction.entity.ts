import { v4 as uuidv4 } from 'uuid';
import { Entry } from './entry.entity';

export class Transaction {
  id: string;
  name?: string;
  entries: Entry[];

  constructor(partial: Partial<Transaction>) {
    this.id = partial.id || uuidv4();
    this.name = partial.name;
    this.entries = partial.entries || [];
  }
}
