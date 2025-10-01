import { Body, Controller, Post } from '@nestjs/common';
import { CreateAccountService } from './create-account.service';
import { CreateAccountDto } from '../../dto/create-account.dto';
import { ComputeBalanceService } from '../../../transactions/use-cases/compute-balance/compute-balance.service';

@Controller('accounts')
export class CreateAccountController {
  constructor(
    private readonly createAccountService: CreateAccountService,
    private readonly computeBalanceService: ComputeBalanceService,
  ) {}

  @Post()
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
