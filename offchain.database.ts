import dotenv from "dotenv";
import * as offchainSchema from "./offchain.schema";
import { drizzle } from "drizzle-orm/node-postgres";
import fs from "fs";
import { createOffchainPool } from "./src/helpers/offchainPool";

fs.existsSync(".env")
  ? dotenv.config({ path: ".env" })
  : dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set");
}

// Preserve URL options (SSL, etc.). offchain.schema.ts qualifies table names.
const pool = createOffchainPool(connectionString);

export default drizzle(pool, { schema: offchainSchema });
