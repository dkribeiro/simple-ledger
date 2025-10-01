import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GetAccountService } from './get-account.service';

@ApiTags('accounts')
@Controller('accounts')
export class GetAccountController {
  constructor(private readonly getAccountService: GetAccountService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get account by ID',
    description:
      'Retrieves an account with its current balance. ' +
      'Balance is computed in real-time from closed_balance + unreconciled transactions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Account UUID',
    example: '71cde2aa-b9bc-496a-a6f1-34964d05e6fd',
  })
  @ApiResponse({
    status: 200,
    description: 'Account found',
    schema: {
      example: {
        id: '71cde2aa-b9bc-496a-a6f1-34964d05e6fd',
        name: 'Cash Account',
        balance: 10000,
        direction: 'debit',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  getById(@Param('id') id: string) {
    return this.getAccountService.execute(id);
  }
}
