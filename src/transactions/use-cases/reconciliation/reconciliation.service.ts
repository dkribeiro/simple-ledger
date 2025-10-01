import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountRepository } from '../../../accounts/data/account.repository';
import { TransactionRepository } from '../../data/transaction.repository';
import { ComputeBalanceService } from '../compute-balance/compute-balance.service';

export interface AccountReconciliationSummary {
  account_id: string;
  previous_closed_balance: number;
  new_closed_balance: number;
  transactions_included: number;
}

export interface ReconciliationResult {
  reconciled_at: Date;
  total_accounts_reconciled: number;
  total_transaction_groups_reconciled: number;
  integrity_check_passed: boolean;
  accounts: AccountReconciliationSummary[];
}

@Injectable()
export class ReconciliationService {
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
   * This is useful for:
   * - End-of-period closing (month-end, year-end)
   * - System-wide reconciliation
   * - Batch processing
   *
   * Process:
   * 1. Verifies all transaction groups balance to zero
   * 2. Gets all unreconciled transaction groups
   * 3. Marks all unreconciled transactions as reconciled
   * 4. Updates closed_balance for all affected accounts
   */
  execute(): ReconciliationResult {
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

    // 3. Mark ALL unreconciled transactions as reconciled
    unreconciledTransactionIds.forEach((transactionId) => {
      this.transactionRepository.reconcileTransactionGroup(
        transactionId,
        reconciledAt,
      );
    });

    // 4. Update closed_balance for all affected accounts
    const accountSummaries = this.updateAccountClosedBalances();

    return {
      reconciled_at: reconciledAt,
      total_accounts_reconciled: accountSummaries.length,
      total_transaction_groups_reconciled: unreconciledTransactionIds.length,
      integrity_check_passed: true,
      accounts: accountSummaries,
    };
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
   */
  private updateAccountClosedBalances(): AccountReconciliationSummary[] {
    const accountIds = this.getAllAccountIdsWithTransactions();
    const summaries: AccountReconciliationSummary[] = [];

    for (const accountId of accountIds) {
      try {
        const account = this.accountRepository.findByIdOrFail(accountId);
        const previousBalance = account.closed_balance;

        // Compute new balance (should now equal closed_balance since all are reconciled)
        const newBalance = this.computeBalanceService.execute(accountId);

        // Count how many unreconciled transactions were for this account
        const accountTransactions =
          this.transactionRepository.findByAccountId(accountId);
        const unreconciledCount = accountTransactions.filter(
          (t) => t.reconciled_at === null,
        ).length;

        // Update the closed balance
        this.accountRepository.updateClosedBalance(accountId, newBalance);

        summaries.push({
          account_id: accountId,
          previous_closed_balance: previousBalance,
          new_closed_balance: newBalance,
          transactions_included: unreconciledCount,
        });
      } catch (error) {
        console.error(`Failed to update account ${accountId}:`, error);
      }
    }

    return summaries;
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
