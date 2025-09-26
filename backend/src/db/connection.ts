import { Pool, PoolConfig } from "pg";

// Get database URL from environment
// Priority: NEON_DATABASE_URL (for cloud) > POSTGRES_URL (for local)
const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  throw new Error(
    "NEON_DATABASE_URL, or POSTGRES_URL environment variable is required"
  );
}

// Database configuration
const dbConfig: PoolConfig = {
  connectionString: DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production" || DATABASE_URL?.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
  // Increase to tolerate cold starts and cross-region latency
  connectionTimeoutMillis: 10000,
};

// Create PostgreSQL connection pool
export const pool = new Pool(dbConfig);
// Test database connection
export async function connectDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully");

    client.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
}

// Helper function for executing queries
export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error("Database query error:", error);
    try {
      console.error("SQL:", text);
    } catch {}
    throw error;
  } finally {
    client.release();
  }
}

// Helper function for transactions
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Closing database connections...");
  await pool.end();
  process.exit(0);
});

export default pool;
