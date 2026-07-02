require('dotenv').config(); 

const { defineConfig } = require('@prisma/config');

module.exports = {
  migrations: {
    seed: 'node ./prisma/seed.js'
  },
  datasource: {
    url: process.env.DATABASE_URL
  }
};