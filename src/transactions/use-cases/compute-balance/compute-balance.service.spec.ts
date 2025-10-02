import { Test, TestingModule } from '@nestjs/testing';
import { ComputeBalanceService } from './compute-balance.service';
import { TransactionRepository } from '../../data/transaction.repository';
import { Account } from '../../../accounts/data/account.entity';
import { Transaction } from '../../data/transaction.entity';

describe('ComputeBalanceService', () => {
  let service: ComputeBalanceService;
  let transactionRepository: TransactionRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComputeBalanceService, TransactionRepository],
    }).compile();

    service = module.get<ComputeBalanceService>(ComputeBalanceService);
    transactionRepository = module.get<TransactionRepository>(
      TransactionRepository,
    );
  });

  // Helper to create test accounts
  const createAccount = (
    id: string,
    direction: 'debit' | 'credit',
    closed_balance: number = 0,
  ): Account => {
    return new Account({ id, direction, closed_balance });
  };

  // Helper to create and save transactions
  const createTransaction = (
    accountId: string,
    direction: 'debit' | 'credit',
    amount: number,
    reconciled: boolean = false,
  ): Transaction => {
    const tx = new Transaction({
      id: `tx-${Math.random()}`,
      transaction_id: 'tx-group-1',
      account_id: accountId,
      direction,
      amount,
      created_at: new Date(),
      reconciled_at: reconciled ? new Date() : null,
    });
    transactionRepository.save(tx);
    return tx;
  };

  describe('execute - success scenarios', () => {
    it('should return closed_balance when no transactions exist', () => {
      const account = createAccount('account-1', 'debit', 5000);

      const balance = service.execute(account);

      expect(balance).toBe(5000);
    });

    it('should return 0 for account with zero closed_balance and no transactions', () => {
      const account = createAccount('account-1', 'debit', 0);

      const balance = service.execute(account);

      expect(balance).toBe(0);
    });

    it('should ignore reconciled transactions', () => {
      const account = createAccount('account-1', 'debit', 1000);

      // Create reconciled transactions (should be ignored)
      createTransaction('account-1', 'debit', 500, true);
      createTransaction('account-1', 'credit', 200, true);

      const balance = service.execute(account);

      expect(balance).toBe(1000); // Only closed_balance, reconciled txs ignored
    });

    it('should add debit transaction to debit account (same direction)', () => {
      const account = createAccount('account-1', 'debit', 1000);

      createTransaction('account-1', 'debit', 500, false);

      const balance = service.execute(account);

      expect(balance).toBe(1500); // 1000 + 500
    });

    it('should subtract credit transaction from debit account (different direction)', () => {
      const account = createAccount('account-1', 'debit', 1000);

      createTransaction('account-1', 'credit', 300, false);

      const balance = service.execute(account);

      expect(balance).toBe(700); // 1000 - 300
    });

    it('should add credit transaction to credit account (same direction)', () => {
      const account = createAccount('account-1', 'credit', 2000);

      createTransaction('account-1', 'credit', 800, false);

      const balance = service.execute(account);

      expect(balance).toBe(2800); // 2000 + 800
    });

    it('should subtract debit transaction from credit account (different direction)', () => {
      const account = createAccount('account-1', 'credit', 2000);

      createTransaction('account-1', 'debit', 400, false);

      const balance = service.execute(account);

      expect(balance).toBe(1600); // 2000 - 400
    });

    it('should process multiple unreconciled transactions', () => {
      const account = createAccount('account-1', 'debit', 1000);

      createTransaction('account-1', 'debit', 500, false); // +500
      createTransaction('account-1', 'debit', 300, false); // +300
      createTransaction('account-1', 'credit', 200, false); // -200

      const balance = service.execute(account);

      expect(balance).toBe(1600); // 1000 + 500 + 300 - 200
    });

    it('should process mix of reconciled and unreconciled transactions', () => {
      const account = createAccount('account-1', 'debit', 1000);

      createTransaction('account-1', 'debit', 500, true); // Reconciled (ignored)
      createTransaction('account-1', 'debit', 300, false); // +300
      createTransaction('account-1', 'credit', 100, true); // Reconciled (ignored)
      createTransaction('account-1', 'credit', 200, false); // -200

      const balance = service.execute(account);

      expect(balance).toBe(1100); // 1000 + 300 - 200
    });

    it('should handle account with only unreconciled transactions', () => {
      const account = createAccount('account-1', 'credit', 0);

      createTransaction('account-1', 'credit', 1000, false);
      createTransaction('account-1', 'credit', 500, false);

      const balance = service.execute(account);

      expect(balance).toBe(1500); // 0 + 1000 + 500
    });

    it('should correctly apply double-entry accounting rules for debit account', () => {
      const account = createAccount('account-1', 'debit', 0);

      // Typical debit account (assets): debits increase, credits decrease
      createTransaction('account-1', 'debit', 1000, false); // +1000
      createTransaction('account-1', 'credit', 400, false); // -400

      const balance = service.execute(account);

      expect(balance).toBe(600); // 0 + 1000 - 400
    });

    it('should correctly apply double-entry accounting rules for credit account', () => {
      const account = createAccount('account-1', 'credit', 0);

      // Typical credit account (liabilities): credits increase, debits decrease
      createTransaction('account-1', 'credit', 1000, false); // +1000
      createTransaction('account-1', 'debit', 400, false); // -400

      const balance = service.execute(account);

      expect(balance).toBe(600); // 0 + 1000 - 400
    });

    it('should handle large closed_balance values', () => {
      const account = createAccount(
        'account-1',
        'debit',
        Number.MAX_SAFE_INTEGER - 1000,
      );

      createTransaction('account-1', 'debit', 500, false);

      const balance = service.execute(account);

      expect(balance).toBe(Number.MAX_SAFE_INTEGER - 500);
    });

    it('should process many transactions efficiently', () => {
      const account = createAccount('account-1', 'debit', 10000);

      // Create 100 unreconciled transactions
      for (let i = 0; i < 50; i++) {
        createTransaction('account-1', 'debit', 100, false); // +100 each
      }
      for (let i = 0; i < 50; i++) {
        createTransaction('account-1', 'credit', 50, false); // -50 each
      }

      const balance = service.execute(account);

      expect(balance).toBe(12500); // 10000 + (50*100) - (50*50)
    });

    it('should only process transactions for the specific account', () => {
      const account1 = createAccount('account-1', 'debit', 1000);
      const account2 = createAccount('account-2', 'credit', 2000);

      createTransaction('account-1', 'debit', 500, false);
      createTransaction('account-2', 'credit', 800, false);

      const balance1 = service.execute(account1);
      const balance2 = service.execute(account2);

      expect(balance1).toBe(1500); // 1000 + 500
      expect(balance2).toBe(2800); // 2000 + 800
    });
  });

  describe('execute - edge cases', () => {
    it('should return closed_balance when only reconciled transactions exist', () => {
      const account = createAccount('account-1', 'debit', 5000);

      createTransaction('account-1', 'debit', 1000, true);
      createTransaction('account-1', 'debit', 2000, true);

      const balance = service.execute(account);

      expect(balance).toBe(5000);
    });

    it('should handle negative balance results', () => {
      const account = createAccount('account-1', 'debit', 1000);

      createTransaction('account-1', 'credit', 1500, false);

      const balance = service.execute(account);

      expect(balance).toBe(-500); // 1000 - 1500
    });

    it('should handle zero amount transactions', () => {
      const account = createAccount('account-1', 'debit', 1000);

      createTransaction('account-1', 'debit', 0, false);
      createTransaction('account-1', 'credit', 0, false);

      const balance = service.execute(account);

      expect(balance).toBe(1000); // No change
    });

    it('should handle account with negative closed_balance', () => {
      const account = createAccount('account-1', 'credit', -500);

      createTransaction('account-1', 'credit', 1000, false);

      const balance = service.execute(account);

      expect(balance).toBe(500); // -500 + 1000
    });

    it('should handle alternating transaction directions', () => {
      const account = createAccount('account-1', 'debit', 1000);

      createTransaction('account-1', 'debit', 100, false); // +100 = 1100
      createTransaction('account-1', 'credit', 50, false); // -50 = 1050
      createTransaction('account-1', 'debit', 200, false); // +200 = 1250
      createTransaction('account-1', 'credit', 150, false); // -150 = 1100
      createTransaction('account-1', 'debit', 300, false); // +300 = 1400

      const balance = service.execute(account);

      expect(balance).toBe(1400);
    });

    it('should handle account with very large number of transactions', () => {
      const account = createAccount('account-1', 'debit', 0);

      // Create 1000 small transactions
      for (let i = 0; i < 1000; i++) {
        createTransaction('account-1', 'debit', 1, false);
      }

      const balance = service.execute(account);

      expect(balance).toBe(1000);
    });

    it('should calculate balance that goes to zero', () => {
      const account = createAccount('account-1', 'debit', 1000);

      createTransaction('account-1', 'credit', 1000, false);

      const balance = service.execute(account);

      expect(balance).toBe(0);
    });

    it('should handle single transaction', () => {
      const account = createAccount('account-1', 'credit', 500);

      createTransaction('account-1', 'credit', 250, false);

      const balance = service.execute(account);

      expect(balance).toBe(750);
    });

    it('should maintain precision with large calculations', () => {
      const account = createAccount('account-1', 'debit', 999999999);

      createTransaction('account-1', 'debit', 888888888, false);
      createTransaction('account-1', 'credit', 777777777, false);

      const balance = service.execute(account);

      expect(balance).toBe(1111111110); // 999999999 + 888888888 - 777777777
    });

    it('should handle complex transaction pattern', () => {
      const account = createAccount('account-1', 'credit', 5000);

      // Simulate realistic transaction pattern
      createTransaction('account-1', 'credit', 10000, false); // Income +10000
      createTransaction('account-1', 'debit', 3000, false); // Expense -3000
      createTransaction('account-1', 'debit', 2000, false); // Expense -2000
      createTransaction('account-1', 'credit', 5000, false); // Income +5000
      createTransaction('account-1', 'debit', 1000, false); // Expense -1000

      const balance = service.execute(account);

      expect(balance).toBe(14000); // 5000 + 10000 - 3000 - 2000 + 5000 - 1000
    });

    it('should return same result on multiple calls (idempotent)', () => {
      const account = createAccount('account-1', 'debit', 1000);

      createTransaction('account-1', 'debit', 500, false);
      createTransaction('account-1', 'credit', 200, false);

      const balance1 = service.execute(account);
      const balance2 = service.execute(account);
      const balance3 = service.execute(account);

      expect(balance1).toBe(1300);
      expect(balance2).toBe(1300);
      expect(balance3).toBe(1300);
    });
  });
});
