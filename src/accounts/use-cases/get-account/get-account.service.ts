import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../data/account.repository';
import { ComputeBalanceService } from '../../../transactions/use-cases/compute-balance/compute-balance.service';
import { AccountResponse } from '../../dto/account-response.dto';

@Injectable()
export class GetAccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly computeBalanceService: ComputeBalanceService,
  ) {}

  execute(id: string): AccountResponse {
    const account = this.accountRepository.findByIdOrFail(id);

    // Compute the current balance from closed_balance + unclosed transactions
    const balance = this.computeBalanceService.execute(account);

    return {
      id: account.id,
      name: account.name,
      balance,
      direction: account.direction,
    };
  }
}
