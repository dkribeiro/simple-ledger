import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateTransactionController } from './create-transaction.controller';
import { CreateTransactionService } from './create-transaction.service';
import { CreateTransactionDto } from '../../dto/create-transaction.dto';
import { TransactionResponse } from '../../dto/transaction-response.dto';

describe('CreateTransactionController', () => {
  let controller: CreateTransactionController;
  let createTransactionService: CreateTransactionService;

  beforeEach(async () => {
    const mockCreateTransactionService = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreateTransactionController],
      providers: [
        {
          provide: CreateTransactionService,
          useValue: mockCreateTransactionService,
        },
      ],
    }).compile();

    controller = module.get<CreateTransactionController>(
      CreateTransactionController,
    );
    createTransactionService = module.get<CreateTransactionService>(
      CreateTransactionService,
    );
  });

  describe('create', () => {
    it('should call service with DTO and return result', () => {
      const dto: CreateTransactionDto = {
        name: 'Test Transaction',
        entries: [
          {
            account_id: 'account-1',
            direction: 'debit',
            amount: 1000,
          },
          {
            account_id: 'account-2',
            direction: 'credit',
            amount: 1000,
          },
        ],
      };

      const mockResponse: TransactionResponse = {
        id: 'generated-id',
        name: 'Test Transaction',
        entries: [
          {
            id: 'entry-1',
            account_id: 'account-1',
            direction: 'debit',
            amount: 1000,
          },
          {
            id: 'entry-2',
            account_id: 'account-2',
            direction: 'credit',
            amount: 1000,
          },
        ],
      };

      jest
        .spyOn(createTransactionService, 'execute')
        .mockReturnValue(mockResponse);

      const result = controller.create(dto);

      expect(createTransactionService.execute).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });

    it('should propagate BadRequestException from service', () => {
      const dto: CreateTransactionDto = {
        entries: [
          {
            account_id: 'account-1',
            direction: 'debit',
            amount: 1000,
          },
          {
            account_id: 'account-2',
            direction: 'credit',
            amount: 500,
          },
        ],
      };

      jest.spyOn(createTransactionService, 'execute').mockImplementation(() => {
        throw new BadRequestException('Transaction is not balanced');
      });

      expect(() => controller.create(dto)).toThrow(BadRequestException);
    });

    it('should propagate NotFoundException from service', () => {
      const dto: CreateTransactionDto = {
        entries: [
          {
            account_id: 'non-existent',
            direction: 'debit',
            amount: 100,
          },
          {
            account_id: 'account-2',
            direction: 'credit',
            amount: 100,
          },
        ],
      };

      jest.spyOn(createTransactionService, 'execute').mockImplementation(() => {
        throw new NotFoundException('Account not found');
      });

      expect(() => controller.create(dto)).toThrow(NotFoundException);
    });

    it('should return response with all required fields', () => {
      const dto: CreateTransactionDto = {
        entries: [
          {
            account_id: 'account-1',
            direction: 'debit',
            amount: 500,
          },
          {
            account_id: 'account-2',
            direction: 'credit',
            amount: 500,
          },
        ],
      };

      const mockResponse: TransactionResponse = {
        id: 'test-id',
        name: undefined,
        entries: [
          {
            id: 'entry-1',
            account_id: 'account-1',
            direction: 'debit',
            amount: 500,
          },
          {
            id: 'entry-2',
            account_id: 'account-2',
            direction: 'credit',
            amount: 500,
          },
        ],
      };

      jest
        .spyOn(createTransactionService, 'execute')
        .mockReturnValue(mockResponse);

      const result = controller.create(dto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('entries');
      expect(result.entries).toHaveLength(2);
    });
  });
});
