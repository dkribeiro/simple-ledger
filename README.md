# Simple Ledger - Double-Entry Accounting System

A double-entry accounting ledger system built with NestJS and TypeScript. This system allows you to create accounts and record financial transactions following double-entry bookkeeping principles.

## ⚠️ Educational Project

This is an **example/reference implementation**.

## Features

- **Account Management**: Create and retrieve accounts with debit or credit directions
- **Transaction Processing**: Record transactions with multiple entries that must balance to zero
- **Immutable Operations**: Accounts can only be modified through transactions
- **Precision**: All monetary values are stored as integers (cents) to avoid floating-point errors
- **In-Memory Storage**: Fast, simple storage for development and testing
- **Optimistic Locking**: Race-condition protection for concurrent updates
- **Automatic Reconciliation**: Hourly cron for performance optimization

## Architecture

This project follows Domain-Driven Design (DDD) principles with a clear separation of concerns:

```
/src
├── /accounts                    # Accounts Domain (Chart of Accounts)
│   ├── /data                    # Persistence layer
│   │   ├── account.entity.ts    # Account entity model
│   │   └── account.repository.ts # Data access
│   ├── /dto                     # API contracts & validation
│   │   └── create-account.dto.ts # Validation DTO
│   ├── /use-cases               # Business logic
│   │   ├── /create-account      # Create account use case
│   │   └── /get-account         # Get account use case
│   └── accounts.module.ts       # Module configuration
│
├── /transactions                # Transactions Domain (Journal & Reconciliation)
│   ├── /data                    # Persistence layer
│   │   ├── transaction.entity.ts # Transaction entity (denormalized)
│   │   └── transaction.repository.ts # Single repository for all transactions
│   ├── /dto                     # API contracts & validation
│   │   └── create-transaction.dto.ts # Validation DTO
│   ├── /use-cases               # Business logic
│   │   ├── /create-transaction  # Create transaction use case
│   │   ├── /compute-balance     # Compute account balance
│   │   └── /reconciliation      # System-wide reconciliation
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

The server will start on `http://localhost:3000` with hot-reload enabled.

### Production Mode

```bash
npm run build
npm run start:prod
```

## Interactive API Documentation (Swagger)

This project includes interactive API documentation powered by Swagger/OpenAPI.

**📚 Access the Swagger UI at:** `http://localhost:3000/docs`

The Swagger UI provides:
- 📖 Complete API reference with request/response schemas
- 🧪 Interactive "Try it out" functionality to test endpoints directly
- 📝 Detailed descriptions of all parameters and responses
- 🏷️ Endpoints organized by tags (Accounts, Transactions)

## API Endpoints Reference

### Create Account

**POST** `/accounts`

Create a new account with a direction (debit or credit).

**Request Body:**

```json
{
  "id": "71cde2aa-b9bc-496a-a6f1-34964d05e6fd", // Optional
  "name": "Cash Account", // Optional
  "direction": "debit" // Required: "debit" or "credit"
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

### Create Transaction

**POST** `/transactions`

Create a transaction with multiple entries. The sum of debits must equal the sum of credits.

**Request Body:**

```json
{
  "id": "3256dc3c-7b18-4a21-95c6-146747cf2971", // Optional
  "name": "Payment for services", // Optional
  "entries": [
    {
      "direction": "debit",
      "account_id": "fa967ec9-5be2-4c26-a874-7eeeabfc6da8",
      "amount": 10000 // $100.00 in cents
    },
    {
      "direction": "credit",
      "account_id": "dbf17d00-8701-4c4e-9fc5-6ae33c324309",
      "amount": 10000 // $100.00 in cents
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

### Reconciliation

**POST** `/accounts/reconcile-all`

Reconciles all unreconciled transactions in the system. This is the **ONLY** way to reconcile transactions.

**Important:** Reconciliation operates on transactions, not individual accounts. When you reconcile, ALL unreconciled transaction groups are marked as reconciled system-wide, ensuring consistency across all accounts.

**Purpose:** This is primarily a **performance optimization** mechanism. By creating balance snapshots (`closed_balance`), account queries only need to sum unreconciled transactions instead of scanning the entire transaction history. Run this frequently based on transaction volume, not just at period-end.

**Automatic Reconciliation:**

The system automatically runs reconciliation **every hour** using NestJS cron scheduler. This ensures optimal balance calculation performance without manual intervention.

You can also manually trigger reconciliation:

- **Manual via API** - Use the endpoint below when needed
- **Automatic (hourly)** - Runs automatically in the background

**When to manually reconcile:**

- **After bulk imports** - When importing many transactions at once
- **When queries slow down** - If account balance calculations become slow  
- **End-of-period closing** - Day, month, quarter, year-end (supplemental)

This endpoint:

- Verifies all transaction groups balance to zero (integrity check)
- Marks ALL unreconciled transactions as reconciled
- Updates `closed_balance` for all affected accounts (performance snapshot)
- Returns a summary of all reconciliations

**Response:**

```json
{
  "reconciled_at": "2025-10-01T12:00:00.000Z",
  "total_accounts_reconciled": 3,
  "total_transaction_groups_reconciled": 8,
  "integrity_check_passed": true,
  "accounts": [
    {
      "account_id": "71cde2aa-b9bc-496a-a6f1-34964d05e6fd",
      "previous_closed_balance": 0,
      "new_closed_balance": 10000,
      "transactions_included": 5
    },
    {
      "account_id": "dbf17d00-8701-4c4e-9fc5-6ae33c324309",
      "previous_closed_balance": 5000,
      "new_closed_balance": 15000,
      "transactions_included": 10
    }
  ]
}
```

## How Account Balances Work

### Transaction Direction Rules

When a transaction line is applied to an account:

- **Same direction**: Balance increases (debit transaction to debit account = +amount)
- **Different direction**: Balance decreases (credit transaction to debit account = -amount)

| Starting Balance | Account Direction | Transaction Direction | Transaction Amount | Ending Balance |
| ---------------- | ----------------- | --------------------- | ------------------ | -------------- |
| 0                | debit             | debit                 | 100                | 100            |
| 0                | credit            | credit                | 100                | 100            |
| 100              | debit             | credit                | 100                | 0              |
| 100              | credit            | debit                 | 100                | 0              |

### Balance Calculation with Reconciliation

```
Account created → closed_balance: 0

Transaction 1 (+$1.00) [reconciled_at: null] → balance: 0 + 100 = 100 cents
Transaction 2 (+$0.50) [reconciled_at: null] → balance: 0 + 100 + 50 = 150 cents
Transaction 3 (-$0.30) [reconciled_at: null] → balance: 0 + 100 + 50 - 30 = 120 cents

Reconciliation called → Mark ALL unreconciled transactions as reconciled (set reconciled_at)
                      → closed_balance updated to: 120 cents for all affected accounts

Transaction 4 (+$0.25) [reconciled_at: null] → balance: 120 + 25 = 145 cents
Transaction 5 (-$0.10) [reconciled_at: null] → balance: 120 + 25 - 10 = 135 cents

GET /accounts/:id → returns balance: 135 cents ($1.35)
                 → Only scans transactions 4 & 5 (WHERE reconciled_at IS NULL)!
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

### Data Integrity & Atomicity

This system demonstrates robust financial data handling through three key principles:

1. **Integer Monetary Values**: All amounts are stored as integers (cents) to avoid floating-point precision errors.

2. **Atomic Transaction Creation**: Transaction creation follows strict validation → build → commit pattern:
   - **Validation Phase**: All business rules validated upfront (balanced entries, accounts exist)
   - **Build Phase**: All transaction lines prepared in memory
   - **Commit Phase**: Atomic save with rollback on any failure
   - Simulates database `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK` behavior

3. **Event-Sourced Balances** (Architectural Choice):
   
   **Why we DON'T update account balances during transaction creation:**
   
   Instead of the traditional "calculate and update balance" approach, this system uses event sourcing where balances are derived on-read:
   
   ```
   current_balance = closed_balance + sum(unreconciled_transactions)
   ```
   
   **Benefits of this approach:**
   - ✅ Eliminates race conditions - balance is never mutated, only calculated
   - ✅ Provides complete audit trail - every transaction preserved immutably  
   - ✅ Enables time-travel queries - balance at any point in history
   - ✅ No locking needed for concurrent transaction creation
   - ✅ Reconciliation updates `closed_balance` as performance optimization only
   
   **Trade-off:**
   - Traditional: Calculate balances → Update accounts → Higher complexity, requires locking
   - This system: Append transactions → Calculate on-read → Simpler, more robust
   
   This is the same pattern used by Kafka, event stores, and modern financial systems. While it differs from "calculate and update balances atomically," it's actually MORE robust for financial data integrity.

### Additional Technical Decisions

4. **Optimistic Locking for Reconciliation**: Race-condition protection for concurrent updates:
   - Each account has a `version` field that increments on every `closed_balance` update
   - When updating during reconciliation:
     1. Read account and capture current version
     2. Compute new closed_balance
     3. Attempt update with version check
     4. If version mismatch → another update occurred → retry
   - Automatic retry with exponential backoff (up to 10 retries)
   - Simple reconciliation lock prevents multiple simultaneous reconciliations
   - **Result**: Safe for high-concurrency scenarios without pessimistic locking
   - Reconciliation response includes `retries` count per account for monitoring

5. **System-Wide Reconciliation**: Performance optimization through balance snapshots:
   - **Primary purpose**: Creates `closed_balance` snapshots to avoid scanning all transactions on every account query
   - **Automatic scheduling**: Runs every hour via NestJS cron (for development/single-instance)
   - **Production**: Should use separate worker process, job queue (Bull/BullMQ), or external scheduler
   - **Only one endpoint**: `POST /accounts/reconcile-all` reconciles ALL unreconciled transactions
   - No single-account reconciliation (would violate double-entry consistency)
   - Transactions have a `reconciled_at: Date | null` field
   - `null` = unreconciled, `Date` = when it was reconciled (audit trail!)
   - Verifies ALL transaction groups balance to zero before reconciling
   - Marks ALL unreconciled transactions as reconciled atomically
   - Updates `closed_balance` for all affected accounts (performance snapshot)
   - After reconciliation, balance queries only need to sum unreconciled transactions
   - Similar to checkpoints in databases or snapshots in event sourcing

6. **Denormalized Transaction Structure**: Simple, pragmatic data model:
   - Single Transaction entity contains both transaction line data and group metadata
   - All transactions with the same `transaction_id` belong to one transaction group
   - Transaction metadata (name, created_at, reconciled_at) duplicated across lines
   - Minimal duplication cost (4 fields) with huge simplicity benefit
   - One repository, one entity - much simpler than normalized structure
   - Still maintains SQL-like queryability with proper indexes

7. **Immutability**: Transaction processing follows a strict pattern:
   - Validate all business rules first
   - Fetch required data
   - Transactions are append-only (never modified after creation)
   - Only the `reconciled_at` timestamp, `closed_balance`, and `version` are updated during reconciliation
   - Transaction metadata (name, created_at) is immutable once written

8. **Dependency Injection**: Full use of NestJS DI for testability and maintainability.

9. **Domain-Driven Design**: Clear separation between Accounts (chart of accounts) and Transactions (journal) domains.

## License

UNLICENSED
