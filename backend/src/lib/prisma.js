import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Ensure env vars are loaded before reading DATABASE_URL
// This is needed because ES module static imports are hoisted —
// server.js's dotenv.config() may not have run yet when this module loads.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/**
 * Prisma Client singleton with MariaDB driver adapter.
 * 
 * Prisma v7 requires a driver adapter for direct database connections.
 * @prisma/adapter-mariadb works with both MariaDB and MySQL (protocol-compatible).
 */

const globalForPrisma = globalThis;

if (!globalForPrisma.__prisma) {
  const url = new URL(process.env.DATABASE_URL);

  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1), // Remove leading /
    ssl: url.searchParams.get('sslmode') === 'required' ? { rejectUnauthorized: false } : false,
    connectionLimit: 5,
  });

  globalForPrisma.__prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  });
}

const prisma = globalForPrisma.__prisma;

export default prisma;
