import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { AccountRepository } from '../../../accounts/data/account.repository';
import { TransactionRepository } from '../../data/transaction.repository';
import { ComputeBalanceService } from '../compute-balance/compute-balance.service';
import { Account } from '../../../accounts/data/account.entity';
import { Transaction } from '../../data/transaction.entity';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let accountRepository: AccountRepository;
  let transactionRepository: TransactionRepository;
  let computeBalanceService: ComputeBalanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        AccountRepository,
        TransactionRepository,
        ComputeBalanceService,
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
    accountRepository = module.get<AccountRepository>(AccountRepository);
    transactionRepository = module.get<TransactionRepository>(
      TransactionRepository,
    );
    computeBalanceService = module.get<ComputeBalanceService>(
      ComputeBalanceService,
    );
  });

  // Helper to create test accounts
  const createAccount = (
    id: string,
    direction: 'debit' | 'credit',
    closed_balance: number = 0,
  ): Account => {
    const account = new Account({ id, direction, closed_balance });
    accountRepository.save(account);
    return account;
  };

  // Helper to create and save transactions
  const createBalancedTransaction = (
    transactionId: string,
    entries: Array<{
      accountId: string;
      direction: 'debit' | 'credit';
      amount: number;
    }>,
  ): Transaction[] => {
    const createdAt = new Date();
    const transactions: Transaction[] = [];

    for (const entry of entries) {
      const tx = new Transaction({
        id: `tx-${Math.random()}`,
        transaction_id: transactionId,
        account_id: entry.accountId,
        direction: entry.direction,
        amount: entry.amount,
        created_at: createdAt,
        reconciled_at: null,
      });
      transactionRepository.save(tx);
      transactions.push(tx);
    }

    return transactions;
  };

  describe('execute - success scenarios', () => {
    it('should reconcile single balanced transaction', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 1000 },
        { accountId: 'account-2', direction: 'credit', amount: 1000 },
      ]);

      const result = await service.execute();

      expect(result.integrity_check_passed).toBe(true);
      expect(result.total_accounts_reconciled).toBe(2);
      expect(result.total_transaction_groups_reconciled).toBe(1);
      expect(result.accounts).toHaveLength(2);
    });

    it('should reconcile multiple balanced transactions', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 500 },
        { accountId: 'account-2', direction: 'credit', amount: 500 },
      ]);

      createBalancedTransaction('tx-2', [
        { accountId: 'account-1', direction: 'debit', amount: 300 },
        { accountId: 'account-2', direction: 'credit', amount: 300 },
      ]);

      const result = await service.execute();

      expect(result.total_transaction_groups_reconciled).toBe(2);
      expect(result.total_accounts_reconciled).toBe(2);
    });

    it('should mark all transactions as reconciled', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');

      const transactions = createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 1000 },
        { accountId: 'account-2', direction: 'credit', amount: 1000 },
      ]);

      await service.execute();

      // Verify all transactions are now reconciled
      const allTransactions = transactionRepository.findByTransactionId('tx-1');
      expect(allTransactions.every((t) => t.reconciled_at !== null)).toBe(true);
    });

    it('should update account closed_balance correctly', async () => {
      const account1 = createAccount('account-1', 'debit', 1000);
      const account2 = createAccount('account-2', 'credit', 2000);

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 500 },
        { accountId: 'account-2', direction: 'credit', amount: 500 },
      ]);

      const result = await service.execute();

      const updatedAccount1 = accountRepository.findById('account-1');
      const updatedAccount2 = accountRepository.findById('account-2');

      expect(updatedAccount1?.closed_balance).toBe(1500); // 1000 + 500
      expect(updatedAccount2?.closed_balance).toBe(2500); // 2000 + 500
    });

    it('should increment account versions', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 1000 },
        { accountId: 'account-2', direction: 'credit', amount: 1000 },
      ]);

      expect(account1.version).toBe(0);
      expect(account2.version).toBe(0);

      await service.execute();

      const updatedAccount1 = accountRepository.findById('account-1');
      const updatedAccount2 = accountRepository.findById('account-2');

      expect(updatedAccount1?.version).toBe(1);
      expect(updatedAccount2?.version).toBe(1);
    });

    it('should return account summaries with correct data', async () => {
      const account1 = createAccount('account-1', 'debit', 1000);

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 500 },
        { accountId: 'account-1', direction: 'credit', amount: 500 },
      ]);

      const result = await service.execute();

      const summary = result.accounts.find((s) => s.account_id === 'account-1');
      expect(summary).toBeDefined();
      expect(summary?.previous_closed_balance).toBe(1000);
      expect(summary?.new_closed_balance).toBe(1000); // +500 -500 = 0
      expect(summary?.version).toBe(1);
      expect(summary?.retries).toBe(0);
    });

    it('should handle transaction with multiple entries (3+)', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');
      const account3 = createAccount('account-3', 'credit');

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 1000 },
        { accountId: 'account-2', direction: 'credit', amount: 600 },
        { accountId: 'account-3', direction: 'credit', amount: 400 },
      ]);

      const result = await service.execute();

      expect(result.total_transaction_groups_reconciled).toBe(1);
      expect(result.total_accounts_reconciled).toBe(3);
    });

    it('should handle reconciliation of many transactions', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');

      // Create 50 balanced transactions
      for (let i = 0; i < 50; i++) {
        createBalancedTransaction(`tx-${i}`, [
          { accountId: 'account-1', direction: 'debit', amount: 100 },
          { accountId: 'account-2', direction: 'credit', amount: 100 },
        ]);
      }

      const result = await service.execute();

      expect(result.total_transaction_groups_reconciled).toBe(50);
    });

    it('should set reconciled_at timestamp', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 1000 },
        { accountId: 'account-2', direction: 'credit', amount: 1000 },
      ]);

      const beforeReconcile = new Date();
      const result = await service.execute();
      const afterReconcile = new Date();

      expect(result.reconciled_at.getTime()).toBeGreaterThanOrEqual(
        beforeReconcile.getTime(),
      );
      expect(result.reconciled_at.getTime()).toBeLessThanOrEqual(
        afterReconcile.getTime(),
      );
    });

    it('should handle accounts with existing closed_balance', async () => {
      const account1 = createAccount('account-1', 'debit', 5000);
      const account2 = createAccount('account-2', 'credit', 3000);

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 1000 },
        { accountId: 'account-2', direction: 'credit', amount: 1000 },
      ]);

      const result = await service.execute();

      const summary1 = result.accounts.find(
        (s) => s.account_id === 'account-1',
      );
      const summary2 = result.accounts.find(
        (s) => s.account_id === 'account-2',
      );

      expect(summary1?.previous_closed_balance).toBe(5000);
      expect(summary1?.new_closed_balance).toBe(6000);
      expect(summary2?.previous_closed_balance).toBe(3000);
      expect(summary2?.new_closed_balance).toBe(4000);
    });

    it('should succeed when no unreconciled transactions exist', async () => {
      const result = await service.execute();

      expect(result.total_transaction_groups_reconciled).toBe(0);
      expect(result.total_accounts_reconciled).toBe(0);
      expect(result.integrity_check_passed).toBe(true);
    });

    it('should not affect already reconciled transactions', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');

      // Create and reconcile first transaction
      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 500 },
        { accountId: 'account-2', direction: 'credit', amount: 500 },
      ]);
      await service.execute();

      // Create new unreconciled transaction
      createBalancedTransaction('tx-2', [
        { accountId: 'account-1', direction: 'debit', amount: 300 },
        { accountId: 'account-2', direction: 'credit', amount: 300 },
      ]);

      const result = await service.execute();

      // Should only reconcile the new transaction
      expect(result.total_transaction_groups_reconciled).toBe(1);
    });
  });

  describe('execute - edge cases', () => {
    it('should throw ConflictException when reconciliation already in progress', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 1000 },
        { accountId: 'account-2', direction: 'credit', amount: 1000 },
      ]);

      // Start first reconciliation (don't await)
      const promise1 = service.execute();

      // Try to start second reconciliation immediately
      await expect(service.execute()).rejects.toThrow(ConflictException);
      await expect(service.execute()).rejects.toThrow(
        'Reconciliation already in progress',
      );

      // Wait for first to complete
      await promise1;
    });

    it('should throw BadRequestException when transaction is unbalanced', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');

      // Create unbalanced transaction by manually saving
      const tx1 = new Transaction({
        id: 'tx-unbalanced-1',
        transaction_id: 'unbalanced-tx',
        account_id: 'account-1',
        direction: 'debit',
        amount: 1000,
        created_at: new Date(),
        reconciled_at: null,
      });
      const tx2 = new Transaction({
        id: 'tx-unbalanced-2',
        transaction_id: 'unbalanced-tx',
        account_id: 'account-2',
        direction: 'credit',
        amount: 500, // Unbalanced!
        created_at: new Date(),
        reconciled_at: null,
      });
      transactionRepository.save(tx1);
      transactionRepository.save(tx2);

      await expect(service.execute()).rejects.toThrow(BadRequestException);
      await expect(service.execute()).rejects.toThrow('not balanced');
    });

    it('should release lock even if reconciliation fails', async () => {
      const account1 = createAccount('account-1', 'debit');

      // Create unbalanced transaction to cause failure
      const tx = new Transaction({
        id: 'tx-fail',
        transaction_id: 'fail-tx',
        account_id: 'account-1',
        direction: 'debit',
        amount: 1000,
        created_at: new Date(),
        reconciled_at: null,
      });
      transactionRepository.save(tx);

      // First attempt should fail
      await expect(service.execute()).rejects.toThrow(BadRequestException);

      // Lock should be released, so second attempt should also fail with same error
      // (not "already in progress")
      await expect(service.execute()).rejects.toThrow(BadRequestException);
    });

    it('should handle account not found during reconciliation', async () => {
      const account1 = createAccount('account-1', 'debit');

      // Create balanced transaction but one account doesn't exist
      createBalancedTransaction('tx-orphan', [
        { accountId: 'account-1', direction: 'debit', amount: 1000 },
        {
          accountId: 'non-existent-account',
          direction: 'credit',
          amount: 1000,
        },
      ]);

      // Should fail when trying to compute balance for non-existent account
      await expect(service.execute()).rejects.toThrow(NotFoundException);
    });

    it('should handle account with negative balance', async () => {
      const account1 = createAccount('account-1', 'debit', -500);
      const account2 = createAccount('account-2', 'credit', 1000);

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 300 },
        { accountId: 'account-2', direction: 'credit', amount: 300 },
      ]);

      const result = await service.execute();

      const summary1 = result.accounts.find(
        (s) => s.account_id === 'account-1',
      );
      expect(summary1?.previous_closed_balance).toBe(-500);
      expect(summary1?.new_closed_balance).toBe(-200); // -500 + 300
    });

    it('should handle very large transaction amounts', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');

      const largeAmount = Number.MAX_SAFE_INTEGER - 1000;
      createBalancedTransaction('tx-large', [
        { accountId: 'account-1', direction: 'debit', amount: largeAmount },
        { accountId: 'account-2', direction: 'credit', amount: largeAmount },
      ]);

      const result = await service.execute();

      const summary1 = result.accounts.find(
        (s) => s.account_id === 'account-1',
      );
      expect(summary1?.new_closed_balance).toBe(largeAmount);
    });

    it('should return total_retries as 0 when no conflicts occur', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 1000 },
        { accountId: 'account-2', direction: 'credit', amount: 1000 },
      ]);

      const result = await service.execute();

      expect(result.total_retries).toBe(0);
    });

    it('should handle concurrent account updates with retry (mocked)', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 1000 },
        { accountId: 'account-2', direction: 'credit', amount: 1000 },
      ]);

      // Mock updateClosedBalance to fail once then succeed
      let callCount = 0;
      const originalUpdate =
        accountRepository.updateClosedBalance.bind(accountRepository);
      jest
        .spyOn(accountRepository, 'updateClosedBalance')
        .mockImplementation((id, balance, version) => {
          callCount++;
          if (callCount === 1) {
            // First call to account-1 fails
            throw new ConflictException('Version mismatch');
          }
          // Subsequent calls succeed
          return originalUpdate(id, balance, version);
        });

      const result = await service.execute();

      expect(result.total_retries).toBeGreaterThan(0);
      expect(result.integrity_check_passed).toBe(true);
    });

    it('should handle transaction with same account multiple times', async () => {
      const account1 = createAccount('account-1', 'debit');
      const account2 = createAccount('account-2', 'credit');

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'debit', amount: 500 },
        { accountId: 'account-1', direction: 'debit', amount: 500 },
        { accountId: 'account-2', direction: 'credit', amount: 1000 },
      ]);

      const result = await service.execute();

      expect(result.total_accounts_reconciled).toBe(2);
      const summary1 = result.accounts.find(
        (s) => s.account_id === 'account-1',
      );
      expect(summary1?.new_closed_balance).toBe(1000); // 0 + 500 + 500
    });

    it('should succeed with empty system (no accounts, no transactions)', async () => {
      const result = await service.execute();

      expect(result.total_accounts_reconciled).toBe(0);
      expect(result.total_transaction_groups_reconciled).toBe(0);
      expect(result.integrity_check_passed).toBe(true);
      expect(result.accounts).toHaveLength(0);
    });

    it('should handle transaction where balance goes to zero', async () => {
      const account1 = createAccount('account-1', 'debit', 1000);
      const account2 = createAccount('account-2', 'credit');

      createBalancedTransaction('tx-1', [
        { accountId: 'account-1', direction: 'credit', amount: 1000 },
        { accountId: 'account-2', direction: 'debit', amount: 1000 },
      ]);

      const result = await service.execute();

      const summary1 = result.accounts.find(
        (s) => s.account_id === 'account-1',
      );
      expect(summary1?.new_closed_balance).toBe(0);
    });
  });
});
