/**
 * Direction represents the type of entry in double-entry bookkeeping.
 * - 'debit': Increases asset/expense accounts, decreases liability/equity/revenue accounts
 * - 'credit': Increases liability/equity/revenue accounts, decreases asset/expense accounts
 */
export type Direction = 'debit' | 'credit';
