import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TransactionRepository } from '../../data/transaction.repository';
import { CreateTransactionDto } from '../../data/create-transaction.dto';
import { Transaction } from '../../data/transaction.entity';
import { AccountRepository } from '../../../accounts/data/account.repository';

@Injectable()
export class CreateTransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountRepository: AccountRepository,
  ) {}

  execute(dto: CreateTransactionDto): {
    id: string;
    name?: string;
    entries: Transaction[];
  } {
    // 1. Validate: Check that debits and credits balance to zero
    this.validateBalance(dto);

    // 2. Fetch & Validate: Ensure all accounts exist
    dto.entries.forEach((lineDto) => {
      this.accountRepository.findByIdOrFail(lineDto.account_id);
    });

    // 3. Generate transaction ID (or use provided one)
    const transactionId = dto.id || uuidv4();
    const transactionName = dto.name;
    const createdAt = new Date();

    // 4. Create and save transaction lines with denormalized metadata
    const transactionLines = dto.entries.map((lineDto) => {
      const transaction = new Transaction({
        id: lineDto.id,
        transaction_id: transactionId, // Same for all lines in this transaction
        transaction_name: transactionName,
        created_at: createdAt, // Same for all lines
        reconciled_at: null, // New transactions are unreconciled
        account_id: lineDto.account_id,
        amount: lineDto.amount,
        direction: lineDto.direction,
      });
      return this.transactionRepository.save(transaction);
    });

    // Return transaction data for API response
    return {
      id: transactionId,
      name: transactionName,
      entries: transactionLines,
    };
  }

  private validateBalance(dto: CreateTransactionDto): void {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const line of dto.entries) {
      if (line.direction === 'debit') {
        totalDebits += line.amount;
      } else {
        totalCredits += line.amount;
      }
    }

    if (totalDebits !== totalCredits) {
      throw new BadRequestException(
        `Transaction is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`,
      );
    }
  }
}
