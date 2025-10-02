import { BadRequestException } from '@nestjs/common';
import { Direction } from './direction.type';

/**
 * Validates that a transaction balances according to double-entry bookkeeping:
 * Total debits must equal total credits.
 *
 * This is the single source of truth for transaction balance validation,
 * used by both transaction creation and reconciliation processes.
 */
export function validateTransactionBalance(
  entries: Array<{ direction: Direction; amount: number }>,
  transactionId?: string,
): { debits: number; credits: number } {
  const totals = entries.reduce(
    (acc, entry) => {
      if (entry.direction === 'debit') {
        acc.debits += entry.amount;
      } else {
        acc.credits += entry.amount;
      }
      return acc;
    },
    { debits: 0, credits: 0 },
  );

  if (totals.debits !== totals.credits) {
    const context = transactionId
      ? `Transaction ${transactionId} is not balanced.`
      : 'Transaction is not balanced.';

    throw new BadRequestException(
      `${context} Debits: ${totals.debits}, Credits: ${totals.credits}`,
    );
  }

  return totals;
}
