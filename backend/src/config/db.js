
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from the environment variables.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (error) => {
  console.error("Unexpected Neon database error:", error.message);
});

export const query = (text, params) => {
  return pool.query(text, params);
};

export const testDatabaseConnection = async () => {
  try {
    const result = await query(`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        NOW() AS server_time
    `);

    console.log("Neon PostgreSQL connected successfully.");
    console.log("Database:", result.rows[0].database_name);

    return result.rows[0];
  } catch (error) {
    console.error("Neon PostgreSQL connection failed:", error.message);
    throw error;
  }
};

export default pool;
