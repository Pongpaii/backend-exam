#  C2C Crypto Exchange — Backend API

A backend service powering a peer-to-peer (C2C) cryptocurrency exchange. Handles wallets, orders, and internal transfers with transactional integrity at the database level.

Built on **Node.js + Express**, backed by **PostgreSQL via Supabase**, with **Prisma ORM** as the data layer.

---

## ⚠️ For Reviewers

This project no longer contains any hardcoded database credentials in `package.json`, `src/app.js`, or `prisma/seed.js` — all of them read the connection string from environment variables (`process.env.DATABASE_URL` / `process.env.SEED_DATABASE_URL`) via `dotenv`.

**To run the project, create your own `.env` file** (see [Configure environment](#2-configure-environment) below) and request the actual connection string from the project owner. No credentials are committed to this repository or shared via this README.

> **Security note:** an earlier version of this project had a live database credential hardcoded in the source and committed to git history. That credential has since been rotated and is no longer valid — do not attempt to reuse any connection string found in old commits.

---

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma Client |
| DB Driver | `pg` (node-postgres) + `@prisma/adapter-pg` |

---

## ER Diagram

![ER Diagram](src/images/ER.jpeg)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the template and fill in your own values:

```bash
cp .env.example .env
```

```env
PORT=3000
DATABASE_URL="postgresql://<user>:<password>@<host>:6543/postgres?pgbouncer=true"
SEED_DATABASE_URL="postgresql://<user>:<password>@<host>:5432/postgres"
```

> - `DATABASE_URL` — used by the app (`src/app.js`) via the pooled/pgbouncer connection on port `6543`. Grab it from your Supabase project settings (`Database → Connection string → Transaction pooler`).
> - `SEED_DATABASE_URL` — used by the seed script (`prisma/seed.js`) via the direct connection on port `5432`, since `pgbouncer` doesn't support some DDL statements used during seeding.
> - **`.env` is gitignored and must never be committed.** Do not hardcode connection strings anywhere in the source — always read them via `process.env.*`.

### 3. Generate the Prisma Client

```bash
npx prisma generate
```

### 4. Seed the database

Populates core currencies (`THB`, `USD`, `BTC`, `ETH`, `XRP`, `DOGE`), mock users, and starting wallet balances.

```bash
npx prisma db seed
```

### 5. Run the server

```bash
node src/app.js
```

Server boots at **http://localhost:3000**

---

## API Reference

### Wallets

**`GET /api/wallets/:userId`**
Returns all wallets belonging to a user, joined with their currency definitions.

---

### Orders

**`POST /api/orders`**
Places a limit order. Validates available balance, deducts it, and moves the equivalent amount into `frozen` — all inside a single DB transaction so partial failures can't leave balances inconsistent.

```json
{
  "userId": 2,
  "currencyId": 1,
  "type": "LIMIT",
  "side": "BUY",
  "amount": 0.05,
  "price": 10000
}
```

---

### Transfers

**`POST /api/transfers`**
Moves funds between two users' wallets. Sender debit and receiver credit happen atomically in an isolated transaction — either both succeed or neither does.

```json
{
  "senderId": 2,
  "receiverId": 1,
  "currencyId": 3,
  "amount": 0.01
}
```

---

## Troubleshooting

### GET request returns `[]` even after seeding

If you've run `npx prisma db seed` and `node src/app.js` successfully, but calling an endpoint via Postman returns an empty `[]`, check the data directly through one of the following methods:

**Prisma Studio**

```bash
npx prisma studio
```

This opens a data management UI at `http://localhost:5555`, where you can inspect the `User`, `Wallet`, and `Currency` tables to confirm whether the seed data actually exists — and edit or add records directly from there if needed.

---

## Notes

- All balance-mutating endpoints (orders, transfers) run inside Prisma `$transaction` blocks to prevent race conditions on concurrent requests.
- Currency and user seed data lives in the Prisma seed script — adjust it there if you need different test fixtures.