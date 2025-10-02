import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Ledger System (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same validation pipe as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Complete Accounting Flow', () => {
    it('should create accounts, process transactions, and calculate balances correctly', async () => {
      // 1. Create a Cash account (debit)
      const cashAccountResponse = await request(app.getHttpServer())
        .post('/accounts')
        .send({
          name: 'Cash',
          direction: 'debit',
        })
        .expect(201);

      const cashAccountId = cashAccountResponse.body.id;
      expect(cashAccountResponse.body.name).toBe('Cash');
      expect(cashAccountResponse.body.direction).toBe('debit');
      expect(cashAccountResponse.body.balance).toBe(0);

      // 2. Create a Revenue account (credit)
      const revenueAccountResponse = await request(app.getHttpServer())
        .post('/accounts')
        .send({
          name: 'Revenue',
          direction: 'credit',
        })
        .expect(201);

      const revenueAccountId = revenueAccountResponse.body.id;
      expect(revenueAccountResponse.body.direction).toBe('credit');
      expect(revenueAccountResponse.body.balance).toBe(0);

      // 3. Create a transaction: Receive $100 cash (debit Cash, credit Revenue)
      const transaction1Response = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          name: 'Sale of services',
          entries: [
            {
              account_id: cashAccountId,
              direction: 'debit',
              amount: 10000, // $100.00 in cents
            },
            {
              account_id: revenueAccountId,
              direction: 'credit',
              amount: 10000,
            },
          ],
        })
        .expect(201);

      expect(transaction1Response.body.entries).toHaveLength(2);

      // 4. Verify Cash account balance (should be $100)
      const cashBalanceAfterTx1 = await request(app.getHttpServer())
        .get(`/accounts/${cashAccountId}`)
        .expect(200);

      expect(cashBalanceAfterTx1.body.balance).toBe(10000); // Cash increased

      // 5. Verify Revenue account balance (should be $100)
      const revenueBalanceAfterTx1 = await request(app.getHttpServer())
        .get(`/accounts/${revenueAccountId}`)
        .expect(200);

      expect(revenueBalanceAfterTx1.body.balance).toBe(10000); // Revenue increased

      // 6. Create another transaction: Receive $50 more
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          name: 'Additional sale',
          entries: [
            {
              account_id: cashAccountId,
              direction: 'debit',
              amount: 5000, // $50.00
            },
            {
              account_id: revenueAccountId,
              direction: 'credit',
              amount: 5000,
            },
          ],
        })
        .expect(201);

      // 7. Verify final balances
      const cashBalanceAfterTx2 = await request(app.getHttpServer())
        .get(`/accounts/${cashAccountId}`)
        .expect(200);

      expect(cashBalanceAfterTx2.body.balance).toBe(15000); // $100 + $50

      const revenueBalanceAfterTx2 = await request(app.getHttpServer())
        .get(`/accounts/${revenueAccountId}`)
        .expect(200);

      expect(revenueBalanceAfterTx2.body.balance).toBe(15000); // $100 + $50
    });

    it('should handle complex multi-entry transactions', async () => {
      // Create accounts
      const cashRes = await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'Cash', direction: 'debit' })
        .expect(201);
      const cashId = cashRes.body.id;

      const salesRes = await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'Sales', direction: 'credit' })
        .expect(201);
      const salesId = salesRes.body.id;

      const taxRes = await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'Sales Tax Payable', direction: 'credit' })
        .expect(201);
      const taxId = taxRes.body.id;

      // Create transaction with 3 entries: $100 cash = $90 sales + $10 tax
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          name: 'Sale with tax',
          entries: [
            { account_id: cashId, direction: 'debit', amount: 10000 },
            { account_id: salesId, direction: 'credit', amount: 9000 },
            { account_id: taxId, direction: 'credit', amount: 1000 },
          ],
        })
        .expect(201);

      // Verify balances
      const cashBalance = await request(app.getHttpServer())
        .get(`/accounts/${cashId}`)
        .expect(200);
      expect(cashBalance.body.balance).toBe(10000);

      const salesBalance = await request(app.getHttpServer())
        .get(`/accounts/${salesId}`)
        .expect(200);
      expect(salesBalance.body.balance).toBe(9000);

      const taxBalance = await request(app.getHttpServer())
        .get(`/accounts/${taxId}`)
        .expect(200);
      expect(taxBalance.body.balance).toBe(1000);
    });

    it('should handle credit and debit operations correctly', async () => {
      // Create Bank account (debit - asset)
      const bankRes = await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'Bank', direction: 'debit' })
        .expect(201);
      const bankId = bankRes.body.id;

      // Create Loan account (credit - liability)
      const loanRes = await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'Loan Payable', direction: 'credit' })
        .expect(201);
      const loanId = loanRes.body.id;

      // Transaction 1: Receive loan of $1000 (debit Bank, credit Loan)
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          name: 'Receive loan',
          entries: [
            { account_id: bankId, direction: 'debit', amount: 100000 },
            { account_id: loanId, direction: 'credit', amount: 100000 },
          ],
        })
        .expect(201);

      // Verify: Bank increased, Loan increased
      let bankBalance = await request(app.getHttpServer())
        .get(`/accounts/${bankId}`)
        .expect(200);
      expect(bankBalance.body.balance).toBe(100000);

      let loanBalance = await request(app.getHttpServer())
        .get(`/accounts/${loanId}`)
        .expect(200);
      expect(loanBalance.body.balance).toBe(100000);

      // Transaction 2: Pay back $200 (credit Bank, debit Loan)
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          name: 'Loan payment',
          entries: [
            { account_id: bankId, direction: 'credit', amount: 20000 },
            { account_id: loanId, direction: 'debit', amount: 20000 },
          ],
        })
        .expect(201);

      // Verify: Bank decreased, Loan decreased
      bankBalance = await request(app.getHttpServer())
        .get(`/accounts/${bankId}`)
        .expect(200);
      expect(bankBalance.body.balance).toBe(80000); // 100000 - 20000

      loanBalance = await request(app.getHttpServer())
        .get(`/accounts/${loanId}`)
        .expect(200);
      expect(loanBalance.body.balance).toBe(80000); // 100000 - 20000
    });
  });

  describe('Reconciliation Flow', () => {
    it('should reconcile transactions and update closed balances', async () => {
      // 1. Create accounts
      const account1Res = await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'Account 1', direction: 'debit' })
        .expect(201);
      const account1Id = account1Res.body.id;

      const account2Res = await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'Account 2', direction: 'credit' })
        .expect(201);
      const account2Id = account2Res.body.id;

      // 2. Create transactions
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          entries: [
            { account_id: account1Id, direction: 'debit', amount: 5000 },
            { account_id: account2Id, direction: 'credit', amount: 5000 },
          ],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          entries: [
            { account_id: account1Id, direction: 'debit', amount: 3000 },
            { account_id: account2Id, direction: 'credit', amount: 3000 },
          ],
        })
        .expect(201);

      // 3. Verify balances before reconciliation
      const balanceBefore1 = await request(app.getHttpServer())
        .get(`/accounts/${account1Id}`)
        .expect(200);
      expect(balanceBefore1.body.balance).toBe(8000);

      // 4. Reconcile all transactions
      const reconciliationRes = await request(app.getHttpServer())
        .post('/transactions/reconciliation')
        .expect(201);

      expect(reconciliationRes.body.total_accounts_reconciled).toBe(2);
      expect(reconciliationRes.body.total_transaction_groups_reconciled).toBe(
        2,
      );
      expect(reconciliationRes.body.integrity_check_passed).toBe(true);

      // 5. Verify balances after reconciliation (should be the same)
      const balanceAfter1 = await request(app.getHttpServer())
        .get(`/accounts/${account1Id}`)
        .expect(200);
      expect(balanceAfter1.body.balance).toBe(8000);

      const balanceAfter2 = await request(app.getHttpServer())
        .get(`/accounts/${account2Id}`)
        .expect(200);
      expect(balanceAfter2.body.balance).toBe(8000);
    });

    it('should calculate balances efficiently after reconciliation', async () => {
      // Create accounts
      const debitRes = await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'Debit Account', direction: 'debit' })
        .expect(201);
      const debitId = debitRes.body.id;

      const creditRes = await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'Credit Account', direction: 'credit' })
        .expect(201);
      const creditId = creditRes.body.id;

      // Create 10 transactions
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/transactions')
          .send({
            entries: [
              { account_id: debitId, direction: 'debit', amount: 1000 },
              { account_id: creditId, direction: 'credit', amount: 1000 },
            ],
          })
          .expect(201);
      }

      // Reconcile
      await request(app.getHttpServer())
        .post('/transactions/reconciliation')
        .expect(201);

      // Create 3 more transactions after reconciliation
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/transactions')
          .send({
            entries: [
              { account_id: debitId, direction: 'debit', amount: 500 },
              { account_id: creditId, direction: 'credit', amount: 500 },
            ],
          })
          .expect(201);
      }

      // Verify balance includes both reconciled and unreconciled transactions
      const finalBalance = await request(app.getHttpServer())
        .get(`/accounts/${debitId}`)
        .expect(200);

      expect(finalBalance.body.balance).toBe(11500); // 10*1000 + 3*500
    });
  });

  describe('Validation and Error Handling', () => {
    it('should reject unbalanced transactions', async () => {
      const account1Res = await request(app.getHttpServer())
        .post('/accounts')
        .send({ direction: 'debit' })
        .expect(201);
      const account1Id = account1Res.body.id;

      const account2Res = await request(app.getHttpServer())
        .post('/accounts')
        .send({ direction: 'credit' })
        .expect(201);
      const account2Id = account2Res.body.id;

      // Try to create unbalanced transaction
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          entries: [
            { account_id: account1Id, direction: 'debit', amount: 1000 },
            { account_id: account2Id, direction: 'credit', amount: 500 },
          ],
        })
        .expect(400);
    });

    it('should reject transaction with non-existent account', async () => {
      const account1Res = await request(app.getHttpServer())
        .post('/accounts')
        .send({ direction: 'debit' })
        .expect(201);
      const account1Id = account1Res.body.id;

      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          entries: [
            { account_id: account1Id, direction: 'debit', amount: 1000 },
            {
              account_id: '00000000-0000-4000-8000-000000000000',
              direction: 'credit',
              amount: 1000,
            },
          ],
        })
        .expect(404);
    });

    it('should reject account creation with invalid direction', async () => {
      await request(app.getHttpServer())
        .post('/accounts')
        .send({
          name: 'Invalid Account',
          direction: 'invalid',
        })
        .expect(400);
    });

    it('should reject transaction with invalid amount', async () => {
      const account1Res = await request(app.getHttpServer())
        .post('/accounts')
        .send({ direction: 'debit' })
        .expect(201);
      const account1Id = account1Res.body.id;

      const account2Res = await request(app.getHttpServer())
        .post('/accounts')
        .send({ direction: 'credit' })
        .expect(201);
      const account2Id = account2Res.body.id;

      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          entries: [
            { account_id: account1Id, direction: 'debit', amount: 0 }, // Invalid: 0
            { account_id: account2Id, direction: 'credit', amount: 0 },
          ],
        })
        .expect(400);
    });

    it('should return 404 for non-existent account', async () => {
      await request(app.getHttpServer())
        .get('/accounts/non-existent-id')
        .expect(404);
    });

    it('should reject transaction with less than 2 entries', async () => {
      const account1Res = await request(app.getHttpServer())
        .post('/accounts')
        .send({ direction: 'debit' })
        .expect(201);
      const account1Id = account1Res.body.id;

      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          entries: [
            { account_id: account1Id, direction: 'debit', amount: 1000 },
          ],
        })
        .expect(400);
    });
  });

  describe('Account Creation', () => {
    it('should create account with custom id', async () => {
      const customId = '12345678-1234-4234-8234-123456789012';

      const response = await request(app.getHttpServer())
        .post('/accounts')
        .send({
          id: customId,
          name: 'Custom ID Account',
          direction: 'debit',
        })
        .expect(201);

      expect(response.body.id).toBe(customId);
      expect(response.body.name).toBe('Custom ID Account');
    });

    it('should reject duplicate account id', async () => {
      const customId = '22345678-2234-4234-8234-223456789012';

      await request(app.getHttpServer())
        .post('/accounts')
        .send({
          id: customId,
          direction: 'debit',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/accounts')
        .send({
          id: customId,
          direction: 'credit',
        })
        .expect(409);
    });
  });

  describe('Real-world Scenario', () => {
    it('should handle complete business day', async () => {
      // Setup: Create chart of accounts
      const cashRes = await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'Cash', direction: 'debit' })
        .expect(201);
      const cashId = cashRes.body.id;

      const bankRes = await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'Bank Account', direction: 'debit' })
        .expect(201);
      const bankId = bankRes.body.id;

      const salesRes = await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'Sales Revenue', direction: 'credit' })
        .expect(201);
      const salesId = salesRes.body.id;

      const expenseRes = await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'Operating Expenses', direction: 'debit' })
        .expect(201);
      const expenseId = expenseRes.body.id;

      // Transaction 1: Cash sale $500
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          name: 'Cash sale #1',
          entries: [
            { account_id: cashId, direction: 'debit', amount: 50000 },
            { account_id: salesId, direction: 'credit', amount: 50000 },
          ],
        })
        .expect(201);

      // Transaction 2: Cash sale $300
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          name: 'Cash sale #2',
          entries: [
            { account_id: cashId, direction: 'debit', amount: 30000 },
            { account_id: salesId, direction: 'credit', amount: 30000 },
          ],
        })
        .expect(201);

      // Transaction 3: Deposit $700 to bank
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          name: 'Bank deposit',
          entries: [
            { account_id: bankId, direction: 'debit', amount: 70000 },
            { account_id: cashId, direction: 'credit', amount: 70000 },
          ],
        })
        .expect(201);

      // Transaction 4: Pay expense from bank $100
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          name: 'Pay rent',
          entries: [
            { account_id: expenseId, direction: 'debit', amount: 10000 },
            { account_id: bankId, direction: 'credit', amount: 10000 },
          ],
        })
        .expect(201);

      // Verify final balances
      let cashBalance = await request(app.getHttpServer())
        .get(`/accounts/${cashId}`)
        .expect(200);
      expect(cashBalance.body.balance).toBe(10000); // 500 + 300 - 700 = 100

      const bankBalance = await request(app.getHttpServer())
        .get(`/accounts/${bankId}`)
        .expect(200);
      expect(bankBalance.body.balance).toBe(60000); // 700 - 100 = 600

      const salesBalance = await request(app.getHttpServer())
        .get(`/accounts/${salesId}`)
        .expect(200);
      expect(salesBalance.body.balance).toBe(80000); // 500 + 300 = 800

      const expenseBalance = await request(app.getHttpServer())
        .get(`/accounts/${expenseId}`)
        .expect(200);
      expect(expenseBalance.body.balance).toBe(10000); // 100

      // End of day: Reconcile all transactions
      const reconciliationRes = await request(app.getHttpServer())
        .post('/transactions/reconciliation')
        .expect(201);

      expect(reconciliationRes.body.total_transaction_groups_reconciled).toBe(
        4,
      );
      expect(reconciliationRes.body.integrity_check_passed).toBe(true);

      // Verify balances remain the same after reconciliation
      cashBalance = await request(app.getHttpServer())
        .get(`/accounts/${cashId}`)
        .expect(200);
      expect(cashBalance.body.balance).toBe(10000);
    });
  });
});
