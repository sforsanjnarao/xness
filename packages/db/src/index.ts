const { PrismaClient } = require("./generated/prisma_client/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({
  adapter,
});


