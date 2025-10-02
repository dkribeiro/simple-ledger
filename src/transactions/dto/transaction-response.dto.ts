import type { Direction } from '../shared/direction.type';

/**
 * API Response DTO for transaction line.
 * Represents the external API contract, excluding internal fields
 * like reconciled_at, created_at, transaction_id that are not needed by clients.
 */
export interface TransactionLineResponse {
  id: string;
  account_id: string;
  amount: number;
  direction: Direction;
}

/**
 * API Response DTO for a complete transaction.
 * This is the public API contract returned to clients.
 */
export interface TransactionResponse {
  id: string;
  name?: string;
  entries: TransactionLineResponse[];
}

