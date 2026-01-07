import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// CHANGE THIS LINE: Import from your custom generated path
// If lib/prisma.ts is in your root/lib folder, and generated is in root/generated:
import { PrismaClient } from '../generated/prisma/client.js' 

const connectionString = process.env.DATABASE_URL // Use the POOLED URL

// Debugging logs
console.log("DB Path:", connectionString); 

if (!connectionString) {
    throw new Error("DATABASE_URL is not defined! Check your .env file.");
}


const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma