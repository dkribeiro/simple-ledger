import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TransactionRepository } from '../../data/transaction.repository';
import { CreateTransactionDto } from '../../dto/create-transaction.dto';
import { Transaction } from '../../data/transaction.entity';
import { AccountRepository } from '../../../accounts/data/account.repository';
import { validateTransactionBalance } from '../../shared/validate-transaction-balance';
import { TransactionResponse } from '../../dto/transaction-response.dto';

@Injectable()
export class CreateTransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountRepository: AccountRepository,
  ) {}

  execute(dto: CreateTransactionDto): TransactionResponse {
    // Validate: Check that debits and credits balance to zero
    validateTransactionBalance(dto.entries);

    // 2. Fetch & Validate: Ensure all accounts exist
    dto.entries.forEach((lineDto) => {
      this.accountRepository.findByIdOrFail(lineDto.account_id);
    });

    // 3. Generate transaction ID and metadata (or use provided one)
    const transactionId = dto.id || uuidv4();
    const transactionName = dto.name;
    const createdAt = new Date();

    // 4. Build all transaction lines first (prepare phase)
    const transactionLines = dto.entries.map(
      (lineDto) =>
        new Transaction({
          id: lineDto.id || uuidv4(),
          transaction_id: transactionId,
          transaction_name: transactionName,
          created_at: createdAt,
          reconciled_at: null,
          account_id: lineDto.account_id,
          amount: lineDto.amount,
          direction: lineDto.direction,
        }),
    );

    // 5. Atomic save: All lines succeed or all rollback
    //    DATABASE equivalent: BEGIN TRANSACTION; INSERT ...; COMMIT;
    const savedLines = this.saveTransactionLinesAtomically(transactionLines);

    // Here we would also send the transactions to a topic for other use cases like statement generation, auditing, analytics, etc.

    // Map domain entities to API response format (exclude internal fields)
    return {
      id: transactionId,
      name: transactionName,
      entries: savedLines.map((line) => ({
        id: line.id,
        account_id: line.account_id,
        amount: line.amount,
        direction: line.direction,
      })),
    };
  }

  /**
   * Atomically save all transaction lines.
   * Simulates database transaction behavior: all succeed or all rollback.
   *
   * In a real database with proper transaction support:
   *   BEGIN TRANSACTION;
   *   INSERT INTO transactions VALUES (...), (...), (...);
   *   COMMIT; (or ROLLBACK on error)
   */
  private saveTransactionLinesAtomically(lines: Transaction[]): Transaction[] {
    const savedLines: Transaction[] = [];

    try {
      // Attempt to save all lines
      for (const line of lines) {
        savedLines.push(this.transactionRepository.save(line));
      }
      return savedLines;
    } catch (error) {
      // Rollback: Remove any partially saved lines
      savedLines.forEach((saved) =>
        this.transactionRepository.delete(saved.id),
      );
      throw error;
    }
  }
}
