import sequelize, { DB_NAME } from './mysql.js';
import mysql from 'mysql2/promise';

// Ensure the target database exists before Sequelize tries to connect
const ensureDatabaseExists = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  
  await connection.execute(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`✅ Database "${DB_NAME}" verified/created`);
  await connection.end();
};

export const connectDB = async () => {
  // First, ensure the target database (from .env DB_NAME) exists in MySQL
  await ensureDatabaseExists();
  
  let retries = 5;
  while (retries > 0) {
    try {
      console.log(`⏳ Connecting to MySQL (Retries left: ${retries})...`);
      await sequelize.authenticate();
      console.log(`✅ MySQL Connected successfully`);

      // Verify we're connected to the correct database
      const [results] = await sequelize.query('SELECT DATABASE() as db_name');
      const connectedDB = results[0].db_name;
      console.log(`🔍 Connected to database: "${connectedDB}"`);
      
      if (connectedDB !== DB_NAME) {
        console.error(`❌ SCHEMA MISMATCH! Expected "${DB_NAME}" but connected to "${connectedDB}"`);
        process.exit(1);
      }
      console.log(`✅ Database schema verified: "${connectedDB}"`);
      
      // Initialize models and associations
      console.log(`⏳ Syncing models...`);
      // Use alter: true to automatically fix schema mismatches from previous versions
      await sequelize.sync({ alter: true });
      console.log(`✅ Models synced`);
      return; // Exit loop on success
    } catch (error) {
      console.error(`❌ MySQL Connection Failed: ${error.message}`);
      retries -= 1;
      if (retries === 0) {
        console.error("❌ Max retries reached. Exiting application.");
        process.exit(1);
      }
      console.log(`⏳ Waiting 5 seconds before retrying...`);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};