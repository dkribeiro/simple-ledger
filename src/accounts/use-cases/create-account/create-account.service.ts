import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../data/account.repository';
import { CreateAccountDto } from '../../dto/create-account.dto';
import { Account } from '../../data/account.entity';

@Injectable()
export class CreateAccountService {
  constructor(private readonly accountRepository: AccountRepository) {}

  execute(dto: CreateAccountDto): Account {
    const account = new Account({
      id: dto.id,
      name: dto.name,
      closed_balance: dto.closed_balance ?? 0,
      direction: dto.direction,
    });

    return this.accountRepository.save(account);
  }
}
