import {
  json,
  numeric,
  pgSchema,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { integer } from "ponder";

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

const bountyExtraTableSchema = {
  bounty_id: integer().notNull(),
  chain_id: integer().notNull(),
  amount_sort: real().notNull(),
  album: text(),
};

export const priceTable = offchainSchema
  ? offchainSchema.table("Price", priceTableSchema)
  : pgTable("Price", priceTableSchema);

export const notificationsTable = offchainSchema
  ? offchainSchema.table("Notifications", notificationsTableSchema)
  : pgTable("Notifications", notificationsTableSchema);

export const bountyExtraTable = offchainSchema
  ? offchainSchema.table("BountiesExtra", bountyExtraTableSchema, (t) => [
      primaryKey({ columns: [t.bounty_id, t.chain_id] }),
    ])
  : pgTable("BountiesExtra", bountyExtraTableSchema, (t) => [
      primaryKey({ columns: [t.bounty_id, t.chain_id] }),
    ]);
