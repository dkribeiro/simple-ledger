import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountRepository } from '../../../accounts/data/account.repository';
import { TransactionRepository } from '../../data/transaction.repository';
import { ComputeBalanceService } from '../compute-balance/compute-balance.service';

export interface ReconciliationResult {
  account_id: string;
  previous_closed_balance: number;
  new_closed_balance: number;
  reconciled_at: Date;
  transactions_reconciled: number;
  integrity_check_passed: boolean;
}

@Injectable()
export class ReconcileAccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly computeBalanceService: ComputeBalanceService,
  ) {}

  /**
   * Reconciles an account by:
   * 1. Verifying transaction integrity (all transactions balance to zero)
   * 2. Computing the current balance from all transactions
   * 3. Marking all unreconciled transactions affecting this account as reconciled
   * 4. Updating the account's closed_balance snapshot
   *
   * This process:
   * - Prevents data corruption by verifying integrity before reconciling
   * - Improves performance by reducing the number of transactions to scan
   * - Creates audit checkpoints in the ledger
   */
  execute(accountId: string): ReconciliationResult {
    const account = this.accountRepository.findByIdOrFail(accountId);
    const previousClosedBalance = account.closed_balance;

    // 1. Verify transaction integrity
    const integrityCheck = this.verifyTransactionIntegrity();
    if (!integrityCheck.passed) {
      throw new BadRequestException(
        `Transaction integrity check failed: ${integrityCheck.error}`,
      );
    }

    // 2. Compute the current balance (closed_balance + unreconciled transactions)
    const currentBalance = this.computeBalanceService.execute(accountId);

    // 3. Get all unreconciled transaction group IDs that affect this account
    const unreconciledTransactions =
      this.transactionRepository.findUnreconciledByAccountId(accountId);
    const transactionIds = new Set(
      unreconciledTransactions.map((transaction) => transaction.transaction_id),
    );

    // 4. Mark all transactions from these groups as reconciled
    const reconciledAt = new Date();
    transactionIds.forEach((transactionId) => {
      this.transactionRepository.reconcileTransactionGroup(
        transactionId,
        reconciledAt,
      );
    });

    // 5. Update the account's closed_balance snapshot
    this.accountRepository.updateClosedBalance(accountId, currentBalance);

    return {
      account_id: accountId,
      previous_closed_balance: previousClosedBalance,
      new_closed_balance: currentBalance,
      reconciled_at: reconciledAt,
      transactions_reconciled: transactionIds.size,
      integrity_check_passed: true,
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
}
