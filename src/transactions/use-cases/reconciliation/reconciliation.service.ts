import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AccountRepository } from '../../../accounts/data/account.repository';
import { TransactionRepository } from '../../data/transaction.repository';
import { ComputeBalanceService } from '../compute-balance/compute-balance.service';

export interface AccountReconciliationSummary {
  account_id: string;
  previous_closed_balance: number;
  new_closed_balance: number;
  transactions_included: number;
  version: number; // Account version after update
  retries: number; // Number of retries due to conflicts
}

export interface ReconciliationResult {
  reconciled_at: Date;
  total_accounts_reconciled: number;
  total_transaction_groups_reconciled: number;
  integrity_check_passed: boolean;
  accounts: AccountReconciliationSummary[];
  total_retries: number; // Total retries across all accounts
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  private reconciliationInProgress = false; // Simple lock to prevent concurrent reconciliations
  private readonly MAX_RETRIES = 10; // Maximum retries per account on version conflict

  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly computeBalanceService: ComputeBalanceService,
  ) {}

  /**
   * Reconciles all unreconciled transactions in the system.
   *
   * This is the ONLY way to reconcile transactions. It operates on transactions,
   * not individual accounts, ensuring consistency across all accounts.
   *
   * Purpose:
   * - Performance optimization: Creates balance snapshots (closed_balance) to avoid
   *   scanning all transactions on every account query
   * - Only unreconciled transactions need to be summed for balance calculation
   * - Should be run frequently based on transaction volume, not just at period-end
   *
   * Use cases:
   * - Regular performance maintenance (e.g., hourly, daily)
   * - End-of-period closing (day, month, year)
   * - After bulk transaction imports
   * - When balance queries become slow
   *
   * Process:
   * 1. Verifies all transaction groups balance to zero
   * 2. Gets all unreconciled transaction groups
   * 3. Marks all unreconciled transactions as reconciled
   * 4. Updates closed_balance for all affected accounts
   */
  execute(): ReconciliationResult {
    // Lock check: Prevent concurrent reconciliations
    if (this.reconciliationInProgress) {
      throw new ConflictException(
        'Reconciliation already in progress. Please wait and try again.',
      );
    }

    this.reconciliationInProgress = true;
    this.logger.log('Starting reconciliation process...');

    try {
      const reconciledAt = new Date();

      // 1. Verify transaction integrity BEFORE reconciling
      const integrityCheck = this.verifyTransactionIntegrity();
      if (!integrityCheck.passed) {
        throw new BadRequestException(
          `Transaction integrity check failed: ${integrityCheck.error}`,
        );
      }

      // 2. Get all unreconciled transaction group IDs
      const unreconciledTransactionIds =
        this.transactionRepository.getUnreconciledTransactionIds();

      this.logger.log(
        `Found ${unreconciledTransactionIds.length} unreconciled transaction groups`,
      );

      // 3. Mark ALL unreconciled transactions as reconciled
      unreconciledTransactionIds.forEach((transactionId) => {
        this.transactionRepository.reconcileTransactionGroup(
          transactionId,
          reconciledAt,
        );
      });

      // 4. Update closed_balance for all affected accounts (with retry logic)
      const accountSummaries = this.updateAccountClosedBalances();

      const totalRetries = accountSummaries.reduce(
        (sum, summary) => sum + summary.retries,
        0,
      );

      this.logger.log(
        `Reconciliation completed. Accounts: ${accountSummaries.length}, Retries: ${totalRetries}`,
      );

      return {
        reconciled_at: reconciledAt,
        total_accounts_reconciled: accountSummaries.length,
        total_transaction_groups_reconciled: unreconciledTransactionIds.length,
        integrity_check_passed: true,
        accounts: accountSummaries,
        total_retries: totalRetries,
      };
    } finally {
      // Always release the lock
      this.reconciliationInProgress = false;
    }
  }

  /**
   * Verify that all transaction groups in the system balance to zero.
   * This is a critical integrity check before reconciliation.
   */
  private verifyTransactionIntegrity(): {
    passed: boolean;
    error?: string;
  } {
    const allTransactionIds = this.transactionRepository.getAllTransactionIds();

    for (const transactionId of allTransactionIds) {
      const transactions =
        this.transactionRepository.findByTransactionId(transactionId);

      let totalDebits = 0;
      let totalCredits = 0;

      for (const transaction of transactions) {
        if (transaction.direction === 'debit') {
          totalDebits += transaction.amount;
        } else {
          totalCredits += transaction.amount;
        }
      }

      if (totalDebits !== totalCredits) {
        return {
          passed: false,
          error: `Transaction ${transactionId} is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`,
        };
      }
    }

    return { passed: true };
  }

  /**
   * Update closed_balance for all accounts that have transactions.
   * Returns a summary of changes for each account.
   *
   * Uses optimistic locking with retry logic to handle concurrent updates:
   * - Fetches account and checks version
   * - Computes new balance
   * - Attempts to update with version check
   * - If version conflict detected, retries the entire process
   * - Gives up after MAX_RETRIES attempts
   */
  private updateAccountClosedBalances(): AccountReconciliationSummary[] {
    const accountIds = this.getAllAccountIdsWithTransactions();
    const summaries: AccountReconciliationSummary[] = [];

    for (const accountId of accountIds) {
      try {
        const summary = this.updateAccountWithRetry(accountId);
        summaries.push(summary);
      } catch (error) {
        this.logger.error(
          `Failed to update account ${accountId} after retries:`,
          error,
        );
        // In production, you might want to collect these failures
        // and return them in the result for manual intervention
      }
    }

    return summaries;
  }

  /**
   * Update a single account's closed_balance with optimistic locking retry logic.
   */
  private updateAccountWithRetry(
    accountId: string,
  ): AccountReconciliationSummary {
    let retries = 0;

    while (retries <= this.MAX_RETRIES) {
      try {
        // Fetch account with current version
        const account = this.accountRepository.findByIdOrFail(accountId);
        const previousBalance = account.closed_balance;
        const currentVersion = account.version;

        // Compute new balance
        const newBalance = this.computeBalanceService.execute(account);

        // Count unreconciled transactions (should be 0 now, but count for audit)
        const accountTransactions =
          this.transactionRepository.findByAccountId(accountId);
        const unreconciledCount = accountTransactions.filter(
          (t) => t.reconciled_at === null,
        ).length;

        // Update with version check (throws ConflictException if version mismatch)
        this.accountRepository.updateClosedBalance(
          accountId,
          newBalance,
          currentVersion,
        );

        // Success! Return summary
        return {
          account_id: accountId,
          previous_closed_balance: previousBalance,
          new_closed_balance: newBalance,
          transactions_included: unreconciledCount,
          version: currentVersion + 1,
          retries,
        };
      } catch (error) {
        if (error instanceof ConflictException) {
          // Version conflict detected - another operation updated the account
          retries++;
          this.logger.warn(
            `Version conflict on account ${accountId}, retry ${retries}/${this.MAX_RETRIES}`,
          );

          if (retries > this.MAX_RETRIES) {
            throw new ConflictException(
              `Failed to update account ${accountId} after ${this.MAX_RETRIES} retries. ` +
                `Too many concurrent updates. Please try reconciliation again.`,
            );
          }

          // Small delay before retry (exponential backoff)
          const delay = Math.min(100 * Math.pow(2, retries - 1), 1000);
          this.sleep(delay);
          continue;
        }

        // Other errors, re-throw
        throw error;
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new Error(`Unexpected state in updateAccountWithRetry`);
  }

  /**
   * Simple synchronous sleep for retry delays.
   */
  private sleep(ms: number): void {
    const start = Date.now();
    while (Date.now() - start < ms) {
      // Busy wait (not ideal, but simple for this use case)
    }
  }

  /**
   * Get all unique account IDs that have transactions in the system.
   */
  private getAllAccountIdsWithTransactions(): string[] {
    const allTransactions = this.transactionRepository.findAll();
    const accountIds = new Set(
      allTransactions.map((transaction) => transaction.account_id),
    );
    return Array.from(accountIds);
  }
}
