import { Controller, Get, Param } from '@nestjs/common';
import { GetAccountService } from './get-account.service';

@Controller('accounts')
export class GetAccountController {
  constructor(private readonly getAccountService: GetAccountService) {}

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.getAccountService.execute(id);
  }
}
