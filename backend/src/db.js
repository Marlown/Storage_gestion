import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DATABASE_HOST || "localhost",
  port: Number(process.env.DATABASE_PORT) || 5432,
  user: process.env.DATABASE_USER || "stock_user",
  password: process.env.DATABASE_PASSWORD || "stock_password",
  database: process.env.DATABASE_NAME || "stock_db",
});

export default pool;
