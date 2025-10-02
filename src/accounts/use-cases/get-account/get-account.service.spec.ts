import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetAccountService } from './get-account.service';
import { AccountRepository } from '../../data/account.repository';
import { ComputeBalanceService } from '../../../transactions/use-cases/compute-balance/compute-balance.service';
import { Account } from '../../data/account.entity';

describe('GetAccountService', () => {
  let service: GetAccountService;
  let repository: AccountRepository;
  let computeBalanceService: ComputeBalanceService;

  beforeEach(async () => {
    const mockComputeBalanceService = {
      execute: jest.fn().mockReturnValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAccountService,
        AccountRepository,
        {
          provide: ComputeBalanceService,
          useValue: mockComputeBalanceService,
        },
      ],
    }).compile();

    service = module.get<GetAccountService>(GetAccountService);
    repository = module.get<AccountRepository>(AccountRepository);
    computeBalanceService = module.get<ComputeBalanceService>(
      ComputeBalanceService,
    );
  });

  describe('execute', () => {
    it('should return account with computed balance', () => {
      const account = new Account({
        id: 'test-id',
        name: 'Test Account',
        direction: 'debit',
        closed_balance: 0,
      });
      repository.save(account);

      jest.spyOn(computeBalanceService, 'execute').mockReturnValue(5000);

      const result = service.execute('test-id');

      expect(result.id).toBe('test-id');
      expect(result.name).toBe('Test Account');
      expect(result.direction).toBe('debit');
      expect(result.balance).toBe(5000);
    });

    it('should return account without name', () => {
      const account = new Account({
        id: 'no-name-id',
        direction: 'credit',
        closed_balance: 0,
      });
      repository.save(account);

      const result = service.execute('no-name-id');

      expect(result.name).toBeUndefined();
      expect(result.direction).toBe('credit');
    });

    it('should return debit account', () => {
      const account = new Account({
        id: 'debit-account',
        direction: 'debit',
        closed_balance: 0,
      });
      repository.save(account);

      const result = service.execute('debit-account');

      expect(result.direction).toBe('debit');
    });

    it('should return credit account', () => {
      const account = new Account({
        id: 'credit-account',
        direction: 'credit',
        closed_balance: 0,
      });
      repository.save(account);

      const result = service.execute('credit-account');

      expect(result.direction).toBe('credit');
    });

    it('should call computeBalanceService with account entity', () => {
      const account = new Account({
        id: 'balance-test',
        direction: 'debit',
        closed_balance: 0,
      });
      repository.save(account);

      const executeSpy = jest.spyOn(computeBalanceService, 'execute');

      service.execute('balance-test');

      expect(executeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'balance-test',
          direction: 'debit',
        }),
      );
    });

    it('should return computed balance from service', () => {
      const account = new Account({
        id: 'computed-balance',
        direction: 'debit',
        closed_balance: 1000,
      });
      repository.save(account);

      jest.spyOn(computeBalanceService, 'execute').mockReturnValue(15000);

      const result = service.execute('computed-balance');

      expect(result.balance).toBe(15000);
    });

    it('should handle account with empty string name', () => {
      const account = new Account({
        id: 'empty-name',
        name: '',
        direction: 'debit',
        closed_balance: 0,
      });
      repository.save(account);

      const result = service.execute('empty-name');

      expect(result.name).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should throw NotFoundException when account does not exist', () => {
      expect(() => service.execute('non-existent-id')).toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with descriptive message', () => {
      expect(() => service.execute('missing-account')).toThrow(
        'Account with ID missing-account not found',
      );
    });

    it('should throw NotFoundException for empty string ID', () => {
      expect(() => service.execute('')).toThrow(NotFoundException);
    });

    it('should handle account that was created and then looked up', () => {
      const account = new Account({
        id: 'lookup-test',
        name: 'Lookup Account',
        direction: 'credit',
        closed_balance: 0,
      });
      repository.save(account);

      const result = service.execute('lookup-test');

      expect(result.id).toBe('lookup-test');
      expect(result.name).toBe('Lookup Account');
    });

    it('should propagate error if computeBalanceService throws', () => {
      const account = new Account({
        id: 'error-test',
        direction: 'debit',
        closed_balance: 0,
      });
      repository.save(account);

      jest.spyOn(computeBalanceService, 'execute').mockImplementation(() => {
        throw new Error('Balance computation failed');
      });

      expect(() => service.execute('error-test')).toThrow(
        'Balance computation failed',
      );
    });

    it('should handle multiple successive lookups', () => {
      const account = new Account({
        id: 'multi-lookup',
        name: 'Multi',
        direction: 'debit',
        closed_balance: 0,
      });
      repository.save(account);

      const result1 = service.execute('multi-lookup');
      const result2 = service.execute('multi-lookup');

      expect(result1).toEqual(result2);
    });

    it('should handle UUID with uppercase letters', () => {
      const account = new Account({
        id: 'AAAAAAAA-BBBB-4CCC-DDDD-EEEEEEEEEEEE',
        direction: 'debit',
        closed_balance: 0,
      });
      repository.save(account);

      const result = service.execute('AAAAAAAA-BBBB-4CCC-DDDD-EEEEEEEEEEEE');

      expect(result.id).toBe('AAAAAAAA-BBBB-4CCC-DDDD-EEEEEEEEEEEE');
    });

    it('should handle very long account names', () => {
      const longName = 'A'.repeat(1000);
      const account = new Account({
        id: 'long-name-test',
        name: longName,
        direction: 'credit',
        closed_balance: 0,
      });
      repository.save(account);

      const result = service.execute('long-name-test');

      expect(result.name).toBe(longName);
    });
  });
});
