import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TransactionRepository } from '../../data/transaction.repository';
import { CreateTransactionDto } from '../../dto/create-transaction.dto';
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

    // 3. Generate transaction ID and metadata (or use provided one)
    const transactionId = dto.id || uuidv4();
    const transactionName = dto.name;
    const createdAt = new Date();

    // 4. Build all transaction lines first (prepare phase - no side effects yet)
    const transactionLines = dto.entries.map((lineDto) => {
      return new Transaction({
        id: lineDto.id || uuidv4(),
        transaction_id: transactionId, // Same for all lines in this transaction
        transaction_name: transactionName,
        created_at: createdAt, // Same for all lines
        reconciled_at: null, // New transactions are unreconciled
        account_id: lineDto.account_id,
        amount: lineDto.amount,
        direction: lineDto.direction,
      });
    });

    // 5. ATOMIC OPERATION: Save all lines at once
    //    Simulates database BEGIN TRANSACTION / COMMIT
    //    DATABASE: BEGIN TRANSACTION
    //              INSERT INTO transactions VALUES (...), (...), (...)
    //              COMMIT (or ROLLBACK on error)
    const savedLines: Transaction[] = [];
    try {
      // Save each line (in real DB, would be a single multi-row INSERT)
      for (const transaction of transactionLines) {
        savedLines.push(this.transactionRepository.save(transaction));
      }
      // All saves succeeded → Transaction committed
    } catch (error) {
      // ROLLBACK: Remove any partially saved lines
      // Simulates database automatic rollback on error
      savedLines.forEach((saved) => {
        this.transactionRepository.delete(saved.id);
      });
      throw error; // Re-throw to signal transaction failed
    }

    // Return transaction data for API response
    return {
      id: transactionId,
      name: transactionName,
      entries: savedLines,
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
