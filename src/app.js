const express = require('express');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

// 1. ตั้งค่าการเชื่อมต่อไดรเวอร์ดั้งเดิมผ่าน Supabase Connection String
const pool = new Pool({ connectionString: "postgresql://postgres.rmpjhtsntiktpmpwlljr:exambackend1234@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true" });
const adapter = new PrismaPg(pool);

// 2. ส่ง Adapter เข้าขั้วประมวลผลของ Prisma 7 ตามกฎข้อบังคับ
const prisma = new PrismaClient({ adapter });
const app = express();

app.use(express.json());

app.get('/api/wallets/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const wallets = await prisma.wallet.findMany({
      where: { userId: userId },
      include: {
        currency: true
      }
    });

    res.json(wallets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});