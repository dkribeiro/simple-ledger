import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateAccountService } from './create-account.service';
import { AccountRepository } from '../../data/account.repository';
import { CreateAccountDto } from '../../dto/create-account.dto';
import { ComputeBalanceService } from '../../../transactions/use-cases/compute-balance/compute-balance.service';

describe('CreateAccountService', () => {
  let service: CreateAccountService;
  let repository: AccountRepository;
  let computeBalanceService: ComputeBalanceService;

  beforeEach(async () => {
    const mockComputeBalanceService = {
      execute: jest.fn().mockReturnValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAccountService,
        AccountRepository,
        {
          provide: ComputeBalanceService,
          useValue: mockComputeBalanceService,
        },
      ],
    }).compile();

    service = module.get<CreateAccountService>(CreateAccountService);
    repository = module.get<AccountRepository>(AccountRepository);
    computeBalanceService = module.get<ComputeBalanceService>(
      ComputeBalanceService,
    );
  });

  describe('execute', () => {
    it('should create account with all fields', () => {
      const dto: CreateAccountDto = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Cash Account',
        direction: 'debit',
      };

      const result = service.execute(dto);

      expect(result.id).toBe(dto.id);
      expect(result.name).toBe(dto.name);
      expect(result.direction).toBe(dto.direction);
      expect(result.balance).toBe(0); // Mocked to return 0
    });

    it('should create account with minimal fields (direction only)', () => {
      const dto: CreateAccountDto = {
        direction: 'credit',
      };

      const result = service.execute(dto);

      expect(result.id).toBeDefined();
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(result.name).toBeUndefined();
      expect(result.direction).toBe('credit');
      expect(result.balance).toBe(0);
    });

    it('should generate UUID when id not provided', () => {
      const dto: CreateAccountDto = {
        direction: 'debit',
      };

      const result1 = service.execute(dto);
      const result2 = service.execute(dto);

      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
      expect(result1.id).not.toBe(result2.id);
    });

    it('should use provided id when given', () => {
      const customId = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
      const dto: CreateAccountDto = {
        id: customId,
        direction: 'debit',
      };

      const result = service.execute(dto);

      expect(result.id).toBe(customId);
    });

    it('should persist account to repository with closed_balance initialized to 0', () => {
      const dto: CreateAccountDto = {
        id: 'test-id-123',
        direction: 'debit',
      };

      service.execute(dto);
      const persisted = repository.findById('test-id-123');

      expect(persisted).toBeDefined();
      expect(persisted?.closed_balance).toBe(0);
      expect(persisted?.version).toBe(0);
    });

    it('should initialize version to 0', () => {
      const dto: CreateAccountDto = {
        id: 'test-id-789',
        direction: 'debit',
      };

      service.execute(dto);
      const persisted = repository.findById('test-id-789');

      expect(persisted?.version).toBe(0);
    });

    it('should create debit account', () => {
      const dto: CreateAccountDto = {
        direction: 'debit',
      };

      const result = service.execute(dto);

      expect(result.direction).toBe('debit');
    });

    it('should create credit account', () => {
      const dto: CreateAccountDto = {
        direction: 'credit',
      };

      const result = service.execute(dto);

      expect(result.direction).toBe('credit');
    });

    it('should handle optional name field', () => {
      const dtoWithName: CreateAccountDto = {
        name: 'Revenue Account',
        direction: 'credit',
      };
      const dtoWithoutName: CreateAccountDto = {
        direction: 'debit',
      };

      const resultWithName = service.execute(dtoWithName);
      const resultWithoutName = service.execute(dtoWithoutName);

      expect(resultWithName.name).toBe('Revenue Account');
      expect(resultWithoutName.name).toBeUndefined();
    });

    it('should create multiple accounts independently', () => {
      const dto1: CreateAccountDto = { direction: 'debit', name: 'Account 1' };
      const dto2: CreateAccountDto = {
        direction: 'credit',
        name: 'Account 2',
      };

      const result1 = service.execute(dto1);
      const result2 = service.execute(dto2);

      expect(result1.id).not.toBe(result2.id);
      expect(result1.name).toBe('Account 1');
      expect(result2.name).toBe('Account 2');
    });

    it('should call computeBalanceService with created account', () => {
      const dto: CreateAccountDto = {
        direction: 'debit',
      };

      service.execute(dto);

      expect(computeBalanceService.execute).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should throw ConflictException when creating account with duplicate ID', () => {
      const dto: CreateAccountDto = {
        id: 'duplicate-id',
        direction: 'debit',
      };

      service.execute(dto);

      expect(() => service.execute(dto)).toThrow(ConflictException);
      expect(() => service.execute(dto)).toThrow(
        'Account with ID duplicate-id already exists',
      );
    });

    it('should throw ConflictException when ID already exists in repository', () => {
      const existingDto: CreateAccountDto = {
        id: 'existing-account-123',
        name: 'First Account',
        direction: 'debit',
      };

      const duplicateDto: CreateAccountDto = {
        id: 'existing-account-123',
        name: 'Second Account',
        direction: 'credit',
      };

      service.execute(existingDto);

      expect(() => service.execute(duplicateDto)).toThrow(ConflictException);
    });

    it('should handle empty string as name', () => {
      const dto: CreateAccountDto = {
        name: '',
        direction: 'debit',
      };

      const result = service.execute(dto);

      expect(result.name).toBe('');
    });

    it('should handle very long account names', () => {
      const longName = 'A'.repeat(1000);
      const dto: CreateAccountDto = {
        name: longName,
        direction: 'credit',
      };

      const result = service.execute(dto);

      expect(result.name).toBe(longName);
    });
  });
});
