import prisma from '../lib/prisma.js';

/**
 * Connect to database using Prisma Client.
 * Replaces the old Sequelize connectDB() which used:
 *   - sequelize.authenticate()
 *   - sequelize.sync({ alter: true })  ← DANGEROUS, now eliminated
 *   - sequelize.query('SELECT DATABASE()')
 * 
 * Prisma connects lazily on first query, but we call $connect()
 * explicitly for fail-fast startup behavior.
 */
export const connectDB = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      console.log(`⏳ Connecting to MySQL via Prisma (Retries left: ${retries})...`);
      await prisma.$connect();
      console.log(`✅ Prisma connected to MySQL successfully`);

      // Verify connection with a lightweight query
      const result = await prisma.$queryRaw`SELECT DATABASE() as db_name`;
      const connectedDB = result[0].db_name;
      console.log(`🔍 Connected to database: "${connectedDB}"`);

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