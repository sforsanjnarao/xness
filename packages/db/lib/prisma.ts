import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// CHANGE THIS LINE: Import from your custom generated path
// If lib/prisma.ts is in your root/lib folder, and generated is in root/generated:
import { PrismaClient } from '../generated/prisma/client.js' 

const connectionString = process.env.DATABASE_URL // Use the POOLED URL

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma