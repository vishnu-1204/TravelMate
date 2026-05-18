import { createClient, type Client } from "@libsql/client";
import { config } from "../config/env";
import { logger } from "./logger";
import fs from "fs";
import path from "path";

let dbInstance: Client | null = null;

export const getDb = (): Client => {
  if (dbInstance) return dbInstance;

  const url = config.tursoDatabaseUrl;
  const authToken = config.tursoAuthToken;

  if (!url) {
    logger("❌ ERROR: TURSO_DATABASE_URL is not configured!");
    throw new Error("TURSO_DATABASE_URL is missing in environment config");
  }

  logger(`Connecting to Turso Database: ${url}`);
  dbInstance = createClient({
    url,
    authToken: authToken || undefined,
  });

  return dbInstance;
};

export const initDatabase = async (): Promise<void> => {
  const client = getDb();
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    if (!fs.existsSync(schemaPath)) {
      logger("⚠️ Warning: schema.sql file not found. Skipping table auto-init.");
      return;
    }

    logger("Checking & Migrating Turso Cloud Schema...");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    
    // Strip single-line comments first, then split by semicolon
    const cleanSql = schemaSql
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => !line.startsWith("--"))
      .join("\n");

    const statements = cleanSql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      await client.execute(statement);
    }

    logger("✅ Turso Cloud Database Tables verified & initialized.");
  } catch (error: any) {
    logger("❌ ERROR: Turso schema migration failed:", error.message || error);
    throw error;
  }
};

export const db = getDb();
export default db;
