import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TransactionRepository } from '../../data/transaction.repository';
import { CreateTransactionDto } from '../../dto/create-transaction.dto';
import { Transaction } from '../../data/transaction.entity';
import { AccountRepository } from '../../../accounts/data/account.repository';
import { validateTransactionBalance } from '../../shared/validate-transaction-balance';
import { TransactionResponse } from '../../dto/transaction-response.dto';

@Injectable()
export class CreateTransactionService {
  private readonly logger = new Logger(CreateTransactionService.name);

  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountRepository: AccountRepository,
  ) {}

  execute(dto: CreateTransactionDto): TransactionResponse {
    // 1. Validation phase - fail fast
    validateTransactionBalance(dto.entries);
    dto.entries.forEach((lineDto) => {
      this.accountRepository.findByIdOrFail(lineDto.account_id);
    });

    // 2. Build phase - prepare transaction lines
    const transactionId = dto.id || uuidv4();

    // Check for duplicate transaction ID (idempotency)
    const existingTransaction =
      this.transactionRepository.findByTransactionId(transactionId);
    if (existingTransaction.length > 0) {
      throw new ConflictException(
        `Transaction with ID ${transactionId} already exists`,
      );
    }
    const transactionName = dto.name;
    const createdAt = new Date();

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

    // 3. Commit phase - atomic save (all succeed or all rollback)
    const savedLines = this.saveTransactionLinesAtomically(transactionLines);

    // Here we would also send the transactions to a topic for other use cases like statement generation, auditing, analytics, etc.

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
   * DATABASE equivalent:
   *   BEGIN TRANSACTION;
   *   INSERT INTO transactions VALUES (...), (...), (...);
   *   COMMIT; (or ROLLBACK on error)
   */
  private saveTransactionLinesAtomically(lines: Transaction[]): Transaction[] {
    const savedLines: Transaction[] = [];

    try {
      for (const line of lines) {
        savedLines.push(this.transactionRepository.save(line));
      }
      return savedLines;
    } catch (error) {
      // CRITICAL: Transaction save failed - rollback all changes
      // PRODUCTION: This should trigger an alert to operations team
      this.logger.error(
        `Transaction creation failed. Rolling back transaction ${lines[0]?.transaction_id}`,
        error instanceof Error ? error.stack : error,
      );

      // Rollback: Remove any partially saved lines
      savedLines.forEach((saved) =>
        this.transactionRepository.delete(saved.id),
      );

      throw error;
    }
  }
}
