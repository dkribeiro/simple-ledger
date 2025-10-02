import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../data/account.repository';
import { ComputeBalanceService } from '../../../transactions/use-cases/compute-balance/compute-balance.service';
import { Direction } from '../../../transactions/shared/direction.type';

export interface AccountWithBalance {
  id: string;
  name?: string;
  balance: number;
  direction: Direction;
}

@Injectable()
export class GetAccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly computeBalanceService: ComputeBalanceService,
  ) {}

  execute(id: string): AccountWithBalance {
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
