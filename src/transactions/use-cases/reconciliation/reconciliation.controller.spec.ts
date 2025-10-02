import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ReconciliationController } from './reconciliation.controller';
import {
  ReconciliationService,
  ReconciliationResult,
} from './reconciliation.service';

describe('ReconciliationController', () => {
  let controller: ReconciliationController;
  let reconciliationService: ReconciliationService;

  beforeEach(async () => {
    const mockReconciliationService = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReconciliationController],
      providers: [
        {
          provide: ReconciliationService,
          useValue: mockReconciliationService,
        },
      ],
    }).compile();

    controller = module.get<ReconciliationController>(ReconciliationController);
    reconciliationService = module.get<ReconciliationService>(
      ReconciliationService,
    );
  });

  describe('reconcile', () => {
    it('should call service and return result', async () => {
      const mockResult: ReconciliationResult = {
        reconciled_at: new Date('2025-10-01T12:00:00.000Z'),
        total_accounts_reconciled: 2,
        total_transaction_groups_reconciled: 5,
        integrity_check_passed: true,
        total_retries: 0,
        accounts: [
          {
            account_id: 'account-1',
            previous_closed_balance: 0,
            new_closed_balance: 5000,
            transactions_included: 3,
            version: 1,
            retries: 0,
          },
        ],
      };

      jest
        .spyOn(reconciliationService, 'execute')
        .mockResolvedValue(mockResult);

      const result = await controller.reconcile();

      expect(reconciliationService.execute).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should propagate BadRequestException from service', async () => {
      jest
        .spyOn(reconciliationService, 'execute')
        .mockRejectedValue(
          new BadRequestException('Transaction is not balanced'),
        );

      await expect(controller.reconcile()).rejects.toThrow(BadRequestException);
    });

    it('should propagate ConflictException from service', async () => {
      jest
        .spyOn(reconciliationService, 'execute')
        .mockRejectedValue(
          new ConflictException('Reconciliation already in progress'),
        );

      await expect(controller.reconcile()).rejects.toThrow(ConflictException);
    });

    it('should return response with all required fields', async () => {
      const mockResult: ReconciliationResult = {
        reconciled_at: new Date(),
        total_accounts_reconciled: 1,
        total_transaction_groups_reconciled: 1,
        integrity_check_passed: true,
        total_retries: 0,
        accounts: [],
      };

      jest
        .spyOn(reconciliationService, 'execute')
        .mockResolvedValue(mockResult);

      const result = await controller.reconcile();

      expect(result).toHaveProperty('reconciled_at');
      expect(result).toHaveProperty('total_accounts_reconciled');
      expect(result).toHaveProperty('total_transaction_groups_reconciled');
      expect(result).toHaveProperty('integrity_check_passed');
      expect(result).toHaveProperty('accounts');
      expect(result).toHaveProperty('total_retries');
    });
  });
});
