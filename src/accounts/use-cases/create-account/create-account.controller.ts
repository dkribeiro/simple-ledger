import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateAccountService } from './create-account.service';
import { CreateAccountDto } from '../../dto/create-account.dto';

@ApiTags('accounts')
@Controller('accounts')
export class CreateAccountController {
  constructor(private readonly createAccountService: CreateAccountService) {}

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
    return this.createAccountService.execute(dto);
  }
}
