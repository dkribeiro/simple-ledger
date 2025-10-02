import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateTransactionService } from './create-transaction.service';
import { TransactionRepository } from '../../data/transaction.repository';
import { AccountRepository } from '../../../accounts/data/account.repository';
import { CreateTransactionDto } from '../../dto/create-transaction.dto';
import { Account } from '../../../accounts/data/account.entity';

describe('CreateTransactionService', () => {
  let service: CreateTransactionService;
  let transactionRepository: TransactionRepository;
  let accountRepository: AccountRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTransactionService,
        TransactionRepository,
        AccountRepository,
      ],
    }).compile();

    service = module.get<CreateTransactionService>(CreateTransactionService);
    transactionRepository = module.get<TransactionRepository>(
      TransactionRepository,
    );
    accountRepository = module.get<AccountRepository>(AccountRepository);
  });

  // Helper to create test accounts
  const createTestAccount = (id: string, direction: 'debit' | 'credit') => {
    const account = new Account({
      id,
      direction,
      closed_balance: 0,
    });
    accountRepository.save(account);
    return account;
  };

  describe('execute - success scenarios', () => {
    it('should create transaction with all fields', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        id: 'transaction-123',
        name: 'Test Transaction',
        entries: [
          {
            id: 'entry-1',
            account_id: account1.id,
            direction: 'debit',
            amount: 1000,
          },
          {
            id: 'entry-2',
            account_id: account2.id,
            direction: 'credit',
            amount: 1000,
          },
        ],
      };

      const result = service.execute(dto);

      expect(result.id).toBe('transaction-123');
      expect(result.name).toBe('Test Transaction');
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].id).toBe('entry-1');
      expect(result.entries[1].id).toBe('entry-2');
    });

    it('should create transaction with minimal fields (no id, no name)', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        entries: [
          {
            account_id: account1.id,
            direction: 'debit',
            amount: 500,
          },
          {
            account_id: account2.id,
            direction: 'credit',
            amount: 500,
          },
        ],
      };

      const result = service.execute(dto);

      expect(result.id).toBeDefined();
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(result.name).toBeUndefined();
      expect(result.entries).toHaveLength(2);
    });

    it('should generate UUID for transaction when not provided', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 100 },
          { account_id: account2.id, direction: 'credit', amount: 100 },
        ],
      };

      const result1 = service.execute(dto);
      const result2 = service.execute(dto);

      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
      expect(result1.id).not.toBe(result2.id);
    });

    it('should generate UUIDs for entries when not provided', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 100 },
          { account_id: account2.id, direction: 'credit', amount: 100 },
        ],
      };

      const result = service.execute(dto);

      expect(result.entries[0].id).toBeDefined();
      expect(result.entries[1].id).toBeDefined();
      expect(result.entries[0].id).not.toBe(result.entries[1].id);
    });

    it('should create transaction with multiple entries (3+ lines)', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');
      const account3 = createTestAccount('account-3', 'credit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 1000 },
          { account_id: account2.id, direction: 'credit', amount: 600 },
          { account_id: account3.id, direction: 'credit', amount: 400 },
        ],
      };

      const result = service.execute(dto);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].amount).toBe(1000);
      expect(result.entries[1].amount).toBe(600);
      expect(result.entries[2].amount).toBe(400);
    });

    it('should persist all transaction lines to repository', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        id: 'persist-test',
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 250 },
          { account_id: account2.id, direction: 'credit', amount: 250 },
        ],
      };

      service.execute(dto);

      const savedTransactions =
        transactionRepository.findByTransactionId('persist-test');
      expect(savedTransactions).toHaveLength(2);
      expect(savedTransactions[0].transaction_id).toBe('persist-test');
      expect(savedTransactions[1].transaction_id).toBe('persist-test');
    });

    it('should set same transaction_id for all entries', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');
      const account3 = createTestAccount('account-3', 'debit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 500 },
          { account_id: account2.id, direction: 'credit', amount: 300 },
          { account_id: account3.id, direction: 'credit', amount: 200 },
        ],
      };

      const result = service.execute(dto);
      const savedTransactions = transactionRepository.findByTransactionId(
        result.id,
      );

      expect(savedTransactions[0].transaction_id).toBe(result.id);
      expect(savedTransactions[1].transaction_id).toBe(result.id);
      expect(savedTransactions[2].transaction_id).toBe(result.id);
    });

    it('should set same created_at for all entries', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 100 },
          { account_id: account2.id, direction: 'credit', amount: 100 },
        ],
      };

      const result = service.execute(dto);
      const savedTransactions = transactionRepository.findByTransactionId(
        result.id,
      );

      expect(savedTransactions[0].created_at).toEqual(
        savedTransactions[1].created_at,
      );
    });

    it('should set reconciled_at to null for new transactions', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 100 },
          { account_id: account2.id, direction: 'credit', amount: 100 },
        ],
      };

      const result = service.execute(dto);
      const savedTransactions = transactionRepository.findByTransactionId(
        result.id,
      );

      expect(savedTransactions[0].reconciled_at).toBeNull();
      expect(savedTransactions[1].reconciled_at).toBeNull();
    });

    it('should handle transaction with same account multiple times', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 500 },
          { account_id: account1.id, direction: 'debit', amount: 500 },
          { account_id: account2.id, direction: 'credit', amount: 1000 },
        ],
      };

      const result = service.execute(dto);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].account_id).toBe(account1.id);
      expect(result.entries[1].account_id).toBe(account1.id);
    });

    it('should handle transaction with large amounts', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        entries: [
          {
            account_id: account1.id,
            direction: 'debit',
            amount: Number.MAX_SAFE_INTEGER,
          },
          {
            account_id: account2.id,
            direction: 'credit',
            amount: Number.MAX_SAFE_INTEGER,
          },
        ],
      };

      const result = service.execute(dto);

      expect(result.entries[0].amount).toBe(Number.MAX_SAFE_INTEGER);
      expect(result.entries[1].amount).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should create multiple independent transactions', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto1: CreateTransactionDto = {
        name: 'Transaction 1',
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 100 },
          { account_id: account2.id, direction: 'credit', amount: 100 },
        ],
      };

      const dto2: CreateTransactionDto = {
        name: 'Transaction 2',
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 200 },
          { account_id: account2.id, direction: 'credit', amount: 200 },
        ],
      };

      const result1 = service.execute(dto1);
      const result2 = service.execute(dto2);

      expect(result1.id).not.toBe(result2.id);
      expect(result1.name).toBe('Transaction 1');
      expect(result2.name).toBe('Transaction 2');
    });

    it('should handle transaction with many entries', () => {
      const accounts = Array.from({ length: 10 }, (_, i) =>
        createTestAccount(`account-${i}`, i < 5 ? 'debit' : 'credit'),
      );

      const dto: CreateTransactionDto = {
        entries: [
          ...accounts.slice(0, 5).map((account) => ({
            account_id: account.id,
            direction: 'debit' as const,
            amount: 200,
          })),
          ...accounts.slice(5).map((account) => ({
            account_id: account.id,
            direction: 'credit' as const,
            amount: 200,
          })),
        ],
      };

      const result = service.execute(dto);

      expect(result.entries).toHaveLength(10);
    });
  });

  describe('execute - edge cases', () => {
    it('should throw BadRequestException when transaction does not balance', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 1000 },
          { account_id: account2.id, direction: 'credit', amount: 500 },
        ],
      };

      expect(() => service.execute(dto)).toThrow(BadRequestException);
      expect(() => service.execute(dto)).toThrow('Transaction is not balanced');
    });

    it('should throw BadRequestException with debit and credit amounts', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 750 },
          { account_id: account2.id, direction: 'credit', amount: 250 },
        ],
      };

      expect(() => service.execute(dto)).toThrow('Debits: 750, Credits: 250');
    });

    it('should throw NotFoundException when account does not exist', () => {
      const account1 = createTestAccount('account-1', 'debit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 100 },
          {
            account_id: 'non-existent-account',
            direction: 'credit',
            amount: 100,
          },
        ],
      };

      expect(() => service.execute(dto)).toThrow(NotFoundException);
      expect(() => service.execute(dto)).toThrow(
        'Account with ID non-existent-account not found',
      );
    });

    it('should validate all accounts exist before processing', () => {
      const account1 = createTestAccount('account-1', 'debit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 100 },
          { account_id: 'missing-1', direction: 'credit', amount: 50 },
          { account_id: 'missing-2', direction: 'credit', amount: 50 },
        ],
      };

      expect(() => service.execute(dto)).toThrow(NotFoundException);
    });

    it('should not save any entries when transaction is unbalanced', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 100 },
          { account_id: account2.id, direction: 'credit', amount: 50 },
        ],
      };

      try {
        service.execute(dto);
      } catch (_error) {
        // Expected error
      }

      // Verify repository is empty (no transactions saved)
      const byAccount1 = transactionRepository.findByAccountId(account1.id);
      const byAccount2 = transactionRepository.findByAccountId(account2.id);
      expect(byAccount1).toHaveLength(0);
      expect(byAccount2).toHaveLength(0);
    });

    it('should not save any entries when account not found', () => {
      const account1 = createTestAccount('account-1', 'debit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 100 },
          {
            account_id: 'non-existent',
            direction: 'credit',
            amount: 100,
          },
        ],
      };

      try {
        service.execute(dto);
      } catch (_error) {
        // Expected error
      }

      // Verify no transactions were saved
      const byAccount1 = transactionRepository.findByAccountId(account1.id);
      expect(byAccount1).toHaveLength(0);
    });

    it('should handle empty entries array at service level', () => {
      const dto: CreateTransactionDto = {
        entries: [],
      };

      // Empty array technically balances (0 = 0)
      // @ArrayMinSize(2) at DTO layer would normally prevent this
      // Service layer focuses on business rule: debits = credits
      const result = service.execute(dto);
      expect(result.entries).toHaveLength(0);
    });

    it('should throw BadRequestException for single entry (unbalanced)', () => {
      const account1 = createTestAccount('account-1', 'debit');

      const dto: CreateTransactionDto = {
        entries: [{ account_id: account1.id, direction: 'debit', amount: 100 }],
      };

      // Single entry cannot balance: debits: 100, credits: 0
      expect(() => service.execute(dto)).toThrow(BadRequestException);
      expect(() => service.execute(dto)).toThrow('Debits: 100, Credits: 0');
    });

    it('should handle transaction where debits > credits', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 1000 },
          { account_id: account2.id, direction: 'credit', amount: 500 },
        ],
      };

      expect(() => service.execute(dto)).toThrow('Debits: 1000, Credits: 500');
    });

    it('should handle transaction where credits > debits', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 300 },
          { account_id: account2.id, direction: 'credit', amount: 800 },
        ],
      };

      expect(() => service.execute(dto)).toThrow('Debits: 300, Credits: 800');
    });

    it('should rollback on repository save failure', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      // Mock repository.save to fail on second call
      let callCount = 0;
      const originalSave = transactionRepository.save.bind(
        transactionRepository,
      ) as typeof transactionRepository.save;
      jest.spyOn(transactionRepository, 'save').mockImplementation((tx) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Database error');
        }
        return originalSave(tx);
      });

      const dto: CreateTransactionDto = {
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 100 },
          { account_id: account2.id, direction: 'credit', amount: 100 },
        ],
      };

      expect(() => service.execute(dto)).toThrow('Database error');

      // Verify no transactions were persisted (rollback worked)
      const byAccount1 = transactionRepository.findByAccountId(account1.id);
      const byAccount2 = transactionRepository.findByAccountId(account2.id);
      expect(byAccount1).toHaveLength(0);
      expect(byAccount2).toHaveLength(0);
    });

    it('should handle empty string as transaction name', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');

      const dto: CreateTransactionDto = {
        name: '',
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 100 },
          { account_id: account2.id, direction: 'credit', amount: 100 },
        ],
      };

      const result = service.execute(dto);

      expect(result.name).toBe('');
    });

    it('should handle very long transaction names', () => {
      const account1 = createTestAccount('account-1', 'debit');
      const account2 = createTestAccount('account-2', 'credit');
      const longName = 'A'.repeat(1000);

      const dto: CreateTransactionDto = {
        name: longName,
        entries: [
          { account_id: account1.id, direction: 'debit', amount: 100 },
          { account_id: account2.id, direction: 'credit', amount: 100 },
        ],
      };

      const result = service.execute(dto);

      expect(result.name).toBe(longName);
    });
  });
});
