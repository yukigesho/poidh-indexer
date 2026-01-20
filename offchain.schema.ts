import {
  json,
  numeric,
  pgSchema,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const schemaName = process.env.DATABASE_SCHEMA!;

export const offchainSchema =
  schemaName && schemaName !== "public" ? pgSchema(schemaName) : null;

const priceTableSchema = {
  id: serial().primaryKey(),
  created_at: timestamp().defaultNow(),
  degen_usd: numeric({
    precision: 20,
    scale: 8,
  }).notNull(),
  eth_usd: numeric({
    precision: 20,
    scale: 8,
  }).notNull(),
};

const notificationsTableSchema = {
  id: serial().primaryKey(),
  created_at: timestamp().defaultNow(),
  event: text().notNull(),
  data: json().notNull(),
  send_at: timestamp(),
};

export const priceTable = offchainSchema
  ? offchainSchema.table("Price", priceTableSchema)
  : pgTable("Price", priceTableSchema);

export const notificationsTable = offchainSchema
  ? offchainSchema.table("Notifications", notificationsTableSchema)
  : pgTable("Notifications", notificationsTableSchema);
