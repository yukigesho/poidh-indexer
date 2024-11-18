import { index, onchainTable, primaryKey, relations } from "@ponder/core";

export const bounties = onchainTable(
  "Bounties",
  (t) => ({
    id: t.integer().notNull(),
    chainId: t.integer().notNull(),

    title: t.text().notNull(),
    description: t.text().notNull(),
    amount: t.text().notNull(),
    issuer: t.hex().notNull(),

    inProgress: t.boolean().default(true),
    isJoinedBounty: t.boolean().default(false),
    isCanceled: t.boolean().default(false),
    isBanned: t.boolean().default(false),
    isMultiplayer: t.boolean(),
    isVoting: t.boolean().default(false),
    deadline: t.integer(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.chainId] }),
  })
);

export const claims = onchainTable(
  "Claims",
  (t) => ({
    id: t.integer().notNull(),
    chainId: t.integer().notNull(),

    title: t.text().notNull(),
    description: t.text().notNull(),
    url: t.text().notNull(),
    issuer: t.hex().notNull(),

    isBanned: t.boolean(),
    isAccepted: t.boolean(),

    bountyId: t.integer().notNull(),
    owner: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.chainId] }),
  })
);

export const users = onchainTable(
  "Users",
  (t) => ({
    address: t.hex().notNull(),
    ens: t.text(),
    degenName: t.text(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.address] }),
  })
);

export const participationsBounties = onchainTable(
  "ParticipationsBounties",
  (t) => ({
    userAddress: t.text().notNull(),
    bountyId: t.integer().notNull(),
    chainId: t.integer().notNull(),
    amount: t.text().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.userAddress, table.bountyId, table.chainId],
    }),
  })
);

export const bountiesRelations = relations(bounties, ({ many }) => ({
  claims: many(claims),
  participants: many(participationsBounties),
}));

export const usersRelations = relations(users, ({ many }) => ({
  bounties: many(bounties),
  claims: many(claims),
  participations: many(participationsBounties),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  bounty: one(bounties, {
    fields: [claims.bountyId, claims.chainId],
    references: [bounties.id, bounties.chainId],
  }),
  issuer: one(users, {
    fields: [claims.issuer],
    references: [users.address],
  }),
  owner: one(users, {
    fields: [claims.owner],
    references: [users.address],
  }),
}));

export const participationsBountiesRelations = relations(
  participationsBounties,
  ({ one }) => ({
    user: one(users, {
      fields: [participationsBounties.userAddress],
      references: [users.address],
    }),
    bounty: one(bounties, {
      fields: [participationsBounties.bountyId],
      references: [bounties.id],
    }),
  })
);
