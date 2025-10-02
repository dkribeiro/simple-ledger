import type { Direction } from '../../transactions/shared/direction.type';

/**
 * API Response DTO for account.
 * Represents the external API contract with computed balance.
 * Internal fields like version and closed_balance are excluded as they're implementation details.
 */
export interface AccountResponse {
  id: string;
  name?: string;
  balance: number; // Computed from closed_balance + unreconciled transactions
  direction: Direction;
}
