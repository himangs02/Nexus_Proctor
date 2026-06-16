import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Resolve .env relative to the backend root (two levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { Sequelize } from "sequelize";

// ── Validate required environment variables ───────────────────────────────
const REQUIRED_ENV = ["DB_HOST", "DB_PORT", "DB_USER", "DB_NAME"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`❌ FATAL: Missing required environment variables: ${missingEnv.join(", ")}`);
  console.error("   Please set them in your .env file and restart the server.");
  process.exit(1);
}

const DB_NAME = process.env.DB_NAME;
const isProduction = process.env.NODE_ENV === "production";

console.log(`🔧 Sequelize target database: "${DB_NAME}" @ ${process.env.DB_HOST}:${process.env.DB_PORT}`);
console.log(`🔒 SSL mode: ${isProduction ? "ENABLED (Aiven)" : "DISABLED (local)"}`);

// ── SSL config for Aiven (required in production) ────────────────────────
const sslOptions = isProduction
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: process.env.DB_SSL_CA ? true : false,
        ...(process.env.DB_SSL_CA && { ca: fs.readFileSync(process.env.DB_SSL_CA) }),
      },
    }
  : {};

const sequelize = new Sequelize(
  DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    dialectOptions: sslOptions,
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    underscored: true,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export default sequelize;
export { DB_NAME };