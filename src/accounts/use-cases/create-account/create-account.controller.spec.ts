import { Test, TestingModule } from '@nestjs/testing';
import { CreateAccountController } from './create-account.controller';
import { CreateAccountService } from './create-account.service';
import { CreateAccountDto } from '../../dto/create-account.dto';
import { AccountResponse } from '../../dto/account-response.dto';

describe('CreateAccountController', () => {
  let controller: CreateAccountController;
  let createAccountService: CreateAccountService;

  beforeEach(async () => {
    const mockCreateAccountService = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreateAccountController],
      providers: [
        {
          provide: CreateAccountService,
          useValue: mockCreateAccountService,
        },
      ],
    }).compile();

    controller = module.get<CreateAccountController>(CreateAccountController);
    createAccountService =
      module.get<CreateAccountService>(CreateAccountService);
  });

  describe('create', () => {
    it('should call service with DTO and return result', () => {
      const dto: CreateAccountDto = {
        name: 'Test Account',
        direction: 'debit',
      };

      const mockResponse: AccountResponse = {
        id: 'generated-id',
        name: 'Test Account',
        direction: 'debit',
        balance: 0,
      };

      jest.spyOn(createAccountService, 'execute').mockReturnValue(mockResponse);

      const result = controller.create(dto);

      expect(createAccountService.execute).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });

    it('should return response with all required fields', () => {
      const dto: CreateAccountDto = {
        direction: 'credit',
      };

      const mockResponse: AccountResponse = {
        id: 'test-id',
        name: undefined,
        direction: 'credit',
        balance: 0,
      };

      jest.spyOn(createAccountService, 'execute').mockReturnValue(mockResponse);

      const result = controller.create(dto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('direction');
      expect(result).toHaveProperty('balance');
    });
  });
});
