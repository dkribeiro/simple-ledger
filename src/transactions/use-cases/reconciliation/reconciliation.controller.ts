import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';

@ApiTags('transactions')
@Controller('transactions')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('reconciliation')
  @ApiOperation({
    summary: 'Reconcile all transactions',
    description:
      'Reconciles ALL unreconciled transactions in the system. This is the ONLY way to reconcile transactions. ' +
      'Verifies transaction integrity, marks all unreconciled transactions as reconciled, ' +
      'and updates closed_balance for all affected accounts. ' +
      'This operation improves balance calculation performance by creating balance snapshots, ' +
      'reducing the number of transactions to scan on each account query. ' +
      'Should be run frequently (daily preferably) to maintain optimal performance.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reconciliation completed successfully',
    schema: {
      example: {
        reconciled_at: '2025-10-01T12:00:00.000Z',
        total_accounts_reconciled: 3,
        total_transaction_groups_reconciled: 8,
        integrity_check_passed: true,
        total_retries: 2,
        accounts: [
          {
            account_id: '71cde2aa-b9bc-496a-a6f1-34964d05e6fd',
            previous_closed_balance: 0,
            new_closed_balance: 10000,
            transactions_included: 5,
            version: 2,
            retries: 1,
          },
          {
            account_id: 'dbf17d00-8701-4c4e-9fc5-6ae33c324309',
            previous_closed_balance: 5000,
            new_closed_balance: 15000,
            transactions_included: 10,
            version: 3,
            retries: 0,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Transaction integrity check failed (unbalanced transactions)',
  })
  @ApiResponse({
    status: 409,
    description:
      'Reconciliation already in progress or too many concurrent updates detected',
  })
  async reconcile() {
    return this.reconciliationService.execute();
  }
}
