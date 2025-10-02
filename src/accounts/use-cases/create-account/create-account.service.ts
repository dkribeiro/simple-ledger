import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../data/account.repository';
import { CreateAccountDto } from '../../dto/create-account.dto';
import { Account } from '../../data/account.entity';
import { ComputeBalanceService } from '../../../transactions/use-cases/compute-balance/compute-balance.service';
import { AccountResponse } from '../../dto/account-response.dto';

@Injectable()
export class CreateAccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly computeBalanceService: ComputeBalanceService,
  ) {}

  execute(dto: CreateAccountDto): AccountResponse {
    const account = new Account({
      id: dto.id,
      name: dto.name,
      closed_balance: dto.closed_balance ?? 0,
      direction: dto.direction,
    });

    this.accountRepository.save(account);

    // Return API response format with computed balance
    return {
      id: account.id,
      name: account.name,
      balance: this.computeBalanceService.execute(account),
      direction: account.direction,
    };
  }
}
