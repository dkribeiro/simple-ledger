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
│   │   └── /get-account         # Get account use case
│   └── accounts.module.ts       # Module configuration
│
├── /transactions                # Transactions Domain (Journal)
│   ├── /data                    # Data layer
│   │   ├── entry.entity.ts      # Entry entity model
│   │   ├── transaction.entity.ts # Transaction entity model
│   │   ├── create-transaction.dto.ts # Validation DTO
│   │   └── transaction.repository.ts # Data access
│   ├── /use-cases               # Business logic
│   │   └── /create-transaction  # Create transaction use case
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
  "balance": 0,                                   // Optional, in cents
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

Retrieve an account by its ID.

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

When an entry is applied to an account:
- **Same direction**: Balance increases (debit entry to debit account = +amount)
- **Different direction**: Balance decreases (credit entry to debit account = -amount)

| Starting Balance | Account Direction | Entry Direction | Entry Amount | Ending Balance |
|-----------------|-------------------|-----------------|--------------|----------------|
| 0               | debit             | debit           | 100          | 100            |
| 0               | credit            | credit          | 100          | 100            |
| 100             | debit             | credit          | 100          | 0              |
| 100             | credit            | debit           | 100          | 0              |

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

2. **Immutability**: Transaction processing follows a strict pattern:
   - Validate all business rules first
   - Fetch required data
   - Calculate new state in memory
   - Commit all changes atomically

3. **Dependency Injection**: Full use of NestJS DI for testability and maintainability.

4. **Domain-Driven Design**: Clear separation between Accounts (chart of accounts) and Transactions (journal) domains.

## License

UNLICENSED
