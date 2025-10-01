import { Body, Controller, Post } from '@nestjs/common';
import { CreateAccountService } from './create-account.service';
import { CreateAccountDto } from '../../data/create-account.dto';

@Controller('accounts')
export class CreateAccountController {
  constructor(private readonly createAccountService: CreateAccountService) {}

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.createAccountService.execute(dto);
  }
}
