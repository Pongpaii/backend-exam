const express = require("express");
const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const pool = new Pool({
  connectionString:
    "postgresql://postgres.rmpjhtsntiktpmpwlljr:exambackend1234@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const app = express();
const cors = require('cors');
app.use(cors());

app.use(express.json());

app.get("/api/wallets/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const wallets = await prisma.wallet.findMany({
      where: { userId },
      include: { currency: true },
    });

    res.json(wallets);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/orders", async (req, res) => {
  const { userId, type, side, currencyId, amount, price } = req.body;

  if (!userId || !type || !side || !currencyId || !amount || !price) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (amount <= 0 || price <= 0) {
    return res
      .status(400)
      .json({ error: "Amount and price must be greater than zero" });
  }

  const totalPrice = amount * price;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findFirst({
        where: { userId, currencyId },
      });

      const requiredAmount = side === "BUY" ? totalPrice : amount;

      if (!wallet || wallet.balance < requiredAmount) {
        throw new Error("Insufficient balance");
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: requiredAmount },
          frozenBalance: { increment: requiredAmount },
        },
      });

      const newOrder = await tx.order.create({
        data: {
          userId,
          currencyId,
          type,
          side,
          price,
          amount,
          status: "PENDING",
        },
      });

      return newOrder;
    });

    res.status(201).json(result);
  } catch (error) {
    if (error.message === "Insufficient balance") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
app.post("/api/transfers", async (req, res) => {
  const { senderId, receiverId, currencyId, amount } = req.body;

  if (!senderId || !receiverId || !currencyId || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (senderId === receiverId) {
    return res
      .status(400)
      .json({ error: "Sender and receiver cannot be the same user" });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: "Amount must be greater than zero" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const senderWallet = await tx.wallet.findFirst({
        where: { userId: senderId, currencyId },
      });

      if (!senderWallet || senderWallet.balance < amount) {
        throw new Error("Insufficient balance");
      }

      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amount } },
      });

      const receiverWallet = await tx.wallet.findFirst({
        where: { userId: receiverId, currencyId },
      });

      if (receiverWallet) {
        await tx.wallet.update({
          where: { id: receiverWallet.id },
          data: { balance: { increment: amount } },
        });
      } else {
        await tx.wallet.create({
          data: {
            userId: receiverId,
            currencyId,
            balance: amount,
            frozenBalance: 0,
          },
        });
      }

      const newTransfer = await tx.transfer.create({
        data: {
          senderId,
          receiverId,
          currencyId,
          amount,
          type: "INTERNAL",
        },
      });

      return newTransfer;
    });

    res.status(201).json(result);
  } catch (error) {
    if (error.message === "Insufficient balance") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});
