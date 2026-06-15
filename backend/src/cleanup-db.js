#!/usr/bin/env node

/**
 * Database Cleanup Script
 * Drops all tables from the proctor database to allow Sequelize to recreate them cleanly
 * Run this ONLY if you're migrating from old schemas
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const cleanupDB = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  });

  try {
    console.log('🧹 Starting database cleanup...\n');

    // Get all tables
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"
    );

    if (tables.length === 0) {
      console.log('✅ Database is already clean (no tables found)\n');
      await connection.end();
      return;
    }

    // Disable foreign key checks temporarily
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('🔓 Disabled foreign key checks\n');

    // Drop all tables
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      await connection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
      console.log(`  ✓ Dropped table: ${tableName}`);
    }

    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n🔒 Re-enabled foreign key checks');
    console.log('✅ Database cleanup completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. npm start       (server will recreate tables with correct schema)');
    console.log('   2. node src/migrate.js  (migrate data from MongoDB if you have any)');

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
};

cleanupDB();
