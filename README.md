# Simple Ledger - Double-Entry Accounting System

A double-entry accounting ledger system built with NestJS and TypeScript. This system allows you to create accounts and record financial transactions following double-entry bookkeeping principles.

## Features

- **Account Management**: Create and retrieve accounts with debit or credit directions
- **Transaction Processing**: Record transactions with multiple entries that must balance to zero
- **Immutable Operations**: Accounts can only be modified through transactions
- **Precision**: All monetary values are stored as integers (cents) to avoid floating-point errors
- **In-Memory Storage**: Fast, simple storage for development and testing

## Architecture

This project follows Domain-Driven Design (DDD) principles with a clear separation of concerns:

```
/src
├── /accounts                    # Accounts Domain (Chart of Accounts)
│   ├── /data                    # Data layer
│   │   ├── account.entity.ts    # Account entity model
│   │   ├── create-account.dto.ts # Validation DTO
│   │   └── account.repository.ts # Data access
│   ├── /use-cases               # Business logic
│   │   ├── /create-account      # Create account use case
│   │   ├── /get-account         # Get account use case
│   │   └── /reconcile-account   # Reconcile account (controller only)
│   └── accounts.module.ts       # Module configuration
│
├── /transactions                # Transactions Domain (Journal)
│   ├── /data                    # Data layer
│   │   ├── entry.entity.ts      # Entry entity (denormalized with transaction metadata)
│   │   ├── entry.repository.ts  # Single repository for all entries
│   │   └── create-transaction.dto.ts # Validation DTO
│   ├── /use-cases               # Business logic
│   │   ├── /create-transaction  # Create transaction use case
│   │   ├── /compute-balance     # Compute account balance
│   │   └── /reconcile-account   # Reconcile account (service)
│   └── transactions.module.ts   # Module configuration
│
├── app.module.ts                # Root application module
└── main.ts                      # Application entry point
```

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd simple-ledger
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment (optional)**
   ```bash
   cp .env.example .env
   # Edit .env if you want to change the default port (5000)
   ```

## Running the Application

### Development Mode
```bash
npm run start:dev
```
The server will start on `http://localhost:5000` with hot-reload enabled.

### Production Mode
```bash
npm run build
npm run start:prod
```

## API Documentation

### Create Account
**POST** `/accounts`

Create a new account with a direction (debit or credit).

**Request Body:**
```json
{
  "id": "71cde2aa-b9bc-496a-a6f1-34964d05e6fd",  // Optional
  "name": "Cash Account",                         // Optional
  "closed_balance": 0,                            // Optional, initial balance in cents
  "direction": "debit"                            // Required: "debit" or "credit"
}
```

**Response:**
```json
{
  "id": "71cde2aa-b9bc-496a-a6f1-34964d05e6fd",
  "name": "Cash Account",
  "balance": 0,
  "direction": "debit"
}
```

### Get Account
**GET** `/accounts/:id`

Retrieve an account by its ID. The balance is computed in real-time from the closed balance plus all unclosed transactions.

**Response:**
```json
{
  "id": "71cde2aa-b9bc-496a-a6f1-34964d05e6fd",
  "name": "Cash Account",
  "balance": 0,
  "direction": "debit"
}
```

### Reconcile Account
**POST** `/accounts/:id/reconcile`

Reconciles an account by marking all unreconciled transactions as reconciled and creating a balance snapshot. This:
- Verifies all transactions are balanced
- Computes the current balance from all transactions
- Marks all unreconciled transactions affecting this account as `reconciled: true`
- Updates the account's closed_balance snapshot
- Improves performance by reducing transaction scans

**Response:**
```json
{
  "account_id": "71cde2aa-b9bc-496a-a6f1-34964d05e6fd",
  "previous_closed_balance": 0,
  "new_closed_balance": 10000,
  "reconciled_at": "2025-10-01T12:00:00.000Z",
  "transactions_reconciled": 5,
  "integrity_check_passed": true
}
```

### Create Transaction
**POST** `/transactions`

Create a transaction with multiple entries. The sum of debits must equal the sum of credits.

**Request Body:**
```json
{
  "id": "3256dc3c-7b18-4a21-95c6-146747cf2971",  // Optional
  "name": "Payment for services",                 // Optional
  "entries": [
    {
      "direction": "debit",
      "account_id": "fa967ec9-5be2-4c26-a874-7eeeabfc6da8",
      "amount": 10000  // $100.00 in cents
    },
    {
      "direction": "credit",
      "account_id": "dbf17d00-8701-4c4e-9fc5-6ae33c324309",
      "amount": 10000  // $100.00 in cents
    }
  ]
}
```

**Response:**
```json
{
  "id": "3256dc3c-7b18-4a21-95c6-146747cf2971",
  "name": "Payment for services",
  "entries": [
    {
      "id": "9f694f8c-9c4c-44cf-9ca9-0cb1a318f0a7",
      "account_id": "fa967ec9-5be2-4c26-a874-7eeeabfc6da8",
      "amount": 10000,
      "direction": "debit"
    },
    {
      "id": "a5c1b7f0-e52e-4ab6-8f31-c380c2223efa",
      "account_id": "dbf17d00-8701-4c4e-9fc5-6ae33c324309",
      "amount": 10000,
      "direction": "credit"
    }
  ]
}
```

## How Account Balances Work

### Entry Direction Rules

When an entry is applied to an account:
- **Same direction**: Balance increases (debit entry to debit account = +amount)
- **Different direction**: Balance decreases (credit entry to debit account = -amount)

| Starting Balance | Account Direction | Entry Direction | Entry Amount | Ending Balance |
|-----------------|-------------------|-----------------|--------------|----------------|
| 0               | debit             | debit           | 100          | 100            |
| 0               | credit            | credit          | 100          | 100            |
| 100             | debit             | credit          | 100          | 0              |
| 100             | credit            | debit           | 100          | 0              |

### Balance Calculation with Reconciliation

```
Account created → closed_balance: 0

Entry 1 (+$1.00) [reconciled_at: null] → balance: 0 + 100 = 100 cents
Entry 2 (+$0.50) [reconciled_at: null] → balance: 0 + 100 + 50 = 150 cents
Entry 3 (-$0.30) [reconciled_at: null] → balance: 0 + 100 + 50 - 30 = 120 cents

Reconcile called → Mark entries 1-3 as reconciled (set reconciled_at timestamp)
                 → closed_balance updated to: 120 cents

Entry 4 (+$0.25) [reconciled_at: null] → balance: 120 + 25 = 145 cents
Entry 5 (-$0.10) [reconciled_at: null] → balance: 120 + 25 - 10 = 135 cents

GET /accounts/:id → returns balance: 135 cents ($1.35)
                 → Only scans entries 4 & 5 (WHERE reconciled_at IS NULL)!
```

## Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Development

```bash
# Format code
npm run format

# Lint code
npm run lint
```

## Key Design Decisions

1. **Integer Monetary Values**: All amounts are stored as integers (cents) to avoid floating-point precision errors.

2. **Event-Sourced Balances**: Account balances are never directly mutated. Instead, they are computed on-demand from transaction history:
   - `current_balance = closed_balance + sum(unreconciled_transactions)`
   - This prevents race conditions since balance is derived, not stored
   - No locking mechanisms needed for concurrent transactions
   - Full audit trail is always maintained

3. **Transaction-Based Reconciliation**: Reconciliation marks entries (not accounts) as processed:
   - Entries have a `reconciled_at: Date | null` field
   - `null` = unreconciled, `Date` = when it was reconciled (audit trail!)
   - Verifies transaction integrity before reconciling
   - Marks all unreconciled entries for a transaction with `reconciled_at` timestamp
   - Creates a balance checkpoint (closed_balance) for performance
   - Reduces the number of entries to scan for balance calculation
   - Similar to month-end closing in traditional accounting

4. **Denormalized Entry Structure**: Simple, pragmatic data model:
   - Single Entry entity contains both entry data and transaction metadata
   - All entries with the same `transaction_id` belong to one transaction
   - Transaction metadata (name, created_at, reconciled_at) duplicated across entries
   - Minimal duplication cost (4 fields) with huge simplicity benefit
   - One repository, one entity - much simpler than normalized structure
   - Still maintains SQL-like queryability with proper indexes

5. **Immutability**: Entry processing follows a strict pattern:
   - Validate all business rules first
   - Fetch required data
   - Entries are append-only (never modified after creation)
   - Only the `reconciled_at` timestamp and closed_balance are updated during reconciliation
   - Transaction metadata (name, created_at) is immutable once written

6. **Dependency Injection**: Full use of NestJS DI for testability and maintainability.

7. **Domain-Driven Design**: Clear separation between Accounts (chart of accounts) and Transactions (journal) domains.

## License

UNLICENSED
