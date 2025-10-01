import { Controller, Param, Post } from '@nestjs/common';
import { ReconcileAccountService } from '../../../transactions/use-cases/reconcile-account/reconcile-account.service';

@Controller('accounts')
export class ReconcileAccountController {
  constructor(
    private readonly reconcileAccountService: ReconcileAccountService,
  ) {}

  @Post(':id/reconcile')
  reconcile(@Param('id') id: string) {
    return this.reconcileAccountService.execute(id);
  }
}
