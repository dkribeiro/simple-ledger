import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateAccountService } from './create-account.service';
import { CreateAccountDto } from '../../dto/create-account.dto';
import { ComputeBalanceService } from '../../../transactions/use-cases/compute-balance/compute-balance.service';

@ApiTags('accounts')
@Controller('accounts')
export class CreateAccountController {
  constructor(
    private readonly createAccountService: CreateAccountService,
    private readonly computeBalanceService: ComputeBalanceService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new account',
    description:
      'Creates a new account with a direction (debit or credit). ' +
      'Returns the account with its computed balance.',
  })
  @ApiResponse({
    status: 201,
    description: 'Account successfully created',
    schema: {
      example: {
        id: '71cde2aa-b9bc-496a-a6f1-34964d05e6fd',
        name: 'Cash Account',
        balance: 0,
        direction: 'debit',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  create(@Body() dto: CreateAccountDto) {
    const account = this.createAccountService.execute(dto);

    // Return account with computed balance for consistency
    const balance = this.computeBalanceService.execute(account);

    return {
      id: account.id,
      name: account.name,
      balance,
      direction: account.direction,
    };
  }
}
