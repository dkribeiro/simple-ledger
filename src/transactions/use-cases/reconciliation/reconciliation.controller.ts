import { Controller, Post } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';

@Controller('accounts')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('reconcile-all')
  reconcile() {
    return this.reconciliationService.execute();
  }
}
