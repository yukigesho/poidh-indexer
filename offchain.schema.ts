import {
  numeric,
  pgSchema,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";

const schemaName = process.env.DATABASE_SCHEMA!;

export const offchainSchema =
  schemaName && schemaName !== "public"
    ? pgSchema(schemaName)
    : null;

export const priceTable = offchainSchema
  ? offchainSchema.table("Price", {
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
    })
  : pgTable("Price", {
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
    });
