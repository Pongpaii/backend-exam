require('dotenv').config(); 

const { defineConfig } = require('@prisma/config');

module.exports = {
  datasource: {
    url: "postgresql://postgres.rmpjhtsntiktpmpwlljr:exambackend1234@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
  }
};