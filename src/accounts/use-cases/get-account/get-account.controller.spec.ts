import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetAccountController } from './get-account.controller';
import { GetAccountService } from './get-account.service';
import { AccountResponse } from '../../dto/account-response.dto';

describe('GetAccountController', () => {
  let controller: GetAccountController;
  let getAccountService: GetAccountService;

  beforeEach(async () => {
    const mockGetAccountService = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GetAccountController],
      providers: [
        {
          provide: GetAccountService,
          useValue: mockGetAccountService,
        },
      ],
    }).compile();

    controller = module.get<GetAccountController>(GetAccountController);
    getAccountService = module.get<GetAccountService>(GetAccountService);
  });

  describe('getById', () => {
    it('should call service with id and return result', () => {
      const mockResponse: AccountResponse = {
        id: 'test-id',
        name: 'Test Account',
        direction: 'debit',
        balance: 5000,
      };

      jest.spyOn(getAccountService, 'execute').mockReturnValue(mockResponse);

      const result = controller.getById('test-id');

      expect(getAccountService.execute).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(mockResponse);
    });

    it('should propagate NotFoundException from service', () => {
      jest.spyOn(getAccountService, 'execute').mockImplementation(() => {
        throw new NotFoundException('Account with ID test-id not found');
      });

      expect(() => controller.getById('test-id')).toThrow(NotFoundException);
    });

    it('should return response with all required fields', () => {
      const mockResponse: AccountResponse = {
        id: 'complete-id',
        name: 'Complete Account',
        direction: 'credit',
        balance: 10000,
      };

      jest.spyOn(getAccountService, 'execute').mockReturnValue(mockResponse);

      const result = controller.getById('complete-id');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('direction');
      expect(result).toHaveProperty('balance');
    });
  });
});
