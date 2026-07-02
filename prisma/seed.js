require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString:
      "postgresql://postgres.rmpjhtsntiktpmpwlljr:exambackend1234@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
  });

  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        id SERIAL PRIMARY KEY, username VARCHAR(255) UNIQUE NOT NULL, email VARCHAR(255) UNIQUE NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "Currency" (
        id SERIAL PRIMARY KEY, code VARCHAR(10) UNIQUE NOT NULL, type VARCHAR(50) NOT NULL, precision INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "Wallet" (
        id SERIAL PRIMARY KEY, "userId" INTEGER REFERENCES "User"(id) ON DELETE CASCADE, "currencyId" INTEGER REFERENCES "Currency"(id) ON DELETE CASCADE,
        balance DOUBLE PRECISION DEFAULT 0, "frozenBalance" DOUBLE PRECISION DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS "Order" (
        id SERIAL PRIMARY KEY, "userId" INTEGER REFERENCES "User"(id), "currencyId" INTEGER REFERENCES "Currency"(id),
        type VARCHAR(50), side VARCHAR(50), price DOUBLE PRECISION, amount DOUBLE PRECISION, status VARCHAR(50)
      );
      CREATE TABLE IF NOT EXISTS "Trade" (
        id SERIAL PRIMARY KEY, "buyerId" INTEGER REFERENCES "User"(id), "sellerId" INTEGER REFERENCES "User"(id),
        price DOUBLE PRECISION, amount DOUBLE PRECISION
      );
      CREATE TABLE IF NOT EXISTS "Transfer" (
        id SERIAL PRIMARY KEY, "senderId" INTEGER REFERENCES "User"(id), "receiverId" INTEGER REFERENCES "User"(id),
        "currencyId" INTEGER REFERENCES "Currency"(id), amount DOUBLE PRECISION, type VARCHAR(50)
      );
    `);

    await client.query(
      'TRUNCATE TABLE "Transfer", "Trade", "Order", "Wallet", "Currency", "User" RESTART IDENTITY CASCADE;',
    );
    const resCurr = await client.query(`
      INSERT INTO "Currency" (code, type, precision) VALUES 
      ('THB', 'FIAT', 2),
      ('USD', 'FIAT', 2),
      ('BTC', 'CRYPTO', 8),
      ('ETH', 'CRYPTO', 8),
      ('XRP', 'CRYPTO', 6),
      ('DOGE', 'CRYPTO', 4)
      RETURNING id, code;
    `);

    const currMap = {};
    resCurr.rows.forEach((row) => {
      currMap[row.code] = row.id;
    });

    const resUser = await client.query(`
      INSERT INTO "User" (username, email, "passwordHash", "createdAt", "updatedAt") VALUES 
      ('somchai_crypto', 'somchai@example.com', 'hashed_password_123', NOW(), NOW()),
      ('john_doe', 'john@example.com', 'hashed_password_456', NOW(), NOW())
      RETURNING id, username;
    `);

    const userMap = {};
    resUser.rows.forEach((row) => {
      userMap[row.username] = row.id;
    });

    await client.query(`
      INSERT INTO "Wallet" ("userId", "currencyId", balance, "frozenBalance") VALUES 
      (${userMap["somchai_crypto"]}, ${currMap["THB"]}, 500000.0, 0.0),
      (${userMap["somchai_crypto"]}, ${currMap["BTC"]}, 0.1, 0.0),
      (${userMap["john_doe"]}, ${currMap["THB"]}, 1000.0, 0.0),
      (${userMap["john_doe"]}, ${currMap["BTC"]}, 2.5, 0.0);
    `);
  } catch (err) {
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
