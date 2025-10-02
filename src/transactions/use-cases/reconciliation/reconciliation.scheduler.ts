import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReconciliationService } from './reconciliation.service';

/**
 * Automatic Reconciliation Scheduler
 *
 * This service runs reconciliation automatically on a schedule using NestJS @Cron decorators.
 * Configured to run every hour to maintain optimal balance calculation performance.
 *
 * ⚠️ PRODUCTION CONSIDERATIONS:
 *
 * This in-process cron approach is ONLY suitable for:
 * - Single-instance applications
 * - Development/testing environments
 *
 * For PRODUCTION environments, we should use:
 *
 * 1. **Separate Worker Process with External Scheduler:**
 *    - Deploy a dedicated worker service/pod
 *    - Run only the reconciliation cron job
 *    - Scale independently from API servers
 *    - Prevents API performance impact during reconciliation
 *    - Guaranteed single execution
 *    - Resource isolation
 *
 * 4. **Distributed Locking (if multi-instance):**
 *    - Prevents duplicate reconciliations when multiple instances run
 *
 * 5. **Monitoring & Alerting:**
 *    - Track reconciliation duration
 *    - Alert on failures
 *    - Monitor retry counts
 *    - Check for stuck reconciliations
 *    - Dashboard with last success timestamp
 *
 * Example Production Architecture:
 *
 *   ┌─────────────────┐      ┌──────────────────┐
 *   │  API Servers    │      │  Worker Service  │
 *   │  (3 instances)  │      │  (1 instance)    │
 *   │                 │      │                  │
 *   │  - Handle API   │      │  - Cron jobs     │
 *   │  - NO cron      │      │  - Reconciliation│
 *   └────────┬────────┘      └────────┬─────────┘
 *            │                        │
 *            └────────┬───────────────┘
 *                     │
 *              ┌──────▼────────┐
 *              │   Database    │
 *              └───────────────┘
 */
@Injectable()
export class ReconciliationScheduler {
  private readonly logger = new Logger(ReconciliationScheduler.name);

  constructor(private readonly reconciliationService: ReconciliationService) {}

  /**
   * Automatic reconciliation - runs every hour
   *
   * Cron expression: At minute 0 of every hour
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'hourly-reconciliation',
    timeZone: 'UTC', // Important: Use UTC to avoid DST issues
  })
  async handleHourlyReconciliation() {
    this.logger.log('Starting scheduled reconciliation...');
    const startTime = Date.now();

    try {
      const result = this.reconciliationService.execute();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Scheduled reconciliation completed successfully in ${duration}ms. ` +
          `Accounts: ${result.total_accounts_reconciled}, ` +
          `Transaction groups: ${result.total_transaction_groups_reconciled}, ` +
          `Retries: ${result.total_retries}`,
      );

      // PRODUCTION: Send metrics to monitoring system
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Scheduled reconciliation failed after ${duration}ms`,
        error,
      );

      // PRODUCTION: Alert on failure
    }
  }

}

