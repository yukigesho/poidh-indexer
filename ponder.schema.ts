import {
  onchainTable,
  primaryKey,
  relations,
} from "ponder";

export const bounties = onchainTable(
  "Bounties",
  (t) => ({
    id: t.integer().notNull(),
    chainId: t.integer().notNull(),

    title: t.text().notNull(),
    description: t.text().notNull(),
    amount: t.text().notNull(),
    amountSort: t.real().notNull(),
    issuer: t.hex().notNull(),

    inProgress: t.boolean().default(true),
    isJoinedBounty: t.boolean().default(false),
    isCanceled: t.boolean().default(false),
    isMultiplayer: t.boolean(),
    isVoting: t.boolean().default(false),
    deadline: t.integer(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.id, table.chainId],
    }),
  }),
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

    isAccepted: t.boolean().default(false),

    bountyId: t.integer().notNull(),
    owner: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.id, table.chainId],
    }),
  }),
);

export const users = onchainTable(
  "Users",
  (t) => ({
    address: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.address] }),
  }),
);

export const degenBoard = onchainTable(
  "DegenBoard",
  (t) => ({
    address: t.hex().notNull(),
    earned: t.real().default(0),
    paid: t.real().default(0),
    nfts: t.real().default(0),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.address] }),
  }),
);

export const baseBoard = onchainTable(
  "BaseBoard",
  (t) => ({
    address: t.hex().notNull(),
    earned: t.real().default(0),
    paid: t.real().default(0),
    nfts: t.real().default(0),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.address] }),
  }),
);

export const arbitrumBoard = onchainTable(
  "ArbitrumBoard",
  (t) => ({
    address: t.hex().notNull(),
    earned: t.real().default(0),
    paid: t.real().default(0),
    nfts: t.real().default(0),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.address] }),
  }),
);

export const participationsBounties =
  onchainTable(
    "ParticipationsBounties",
    (t) => ({
      userAddress: t.hex().notNull(),
      bountyId: t.integer().notNull(),
      chainId: t.integer().notNull(),
      amount: t.text().notNull(),
    }),
    (table) => ({
      pk: primaryKey({
        columns: [
          table.userAddress,
          table.bountyId,
          table.chainId,
        ],
      }),
    }),
  );

export const transactions = onchainTable(
  "Transactions",
  (t) => ({
    tx: t.hex().notNull(),
    index: t.integer().notNull(),
    bountyId: t.integer().notNull(),
    chainId: t.integer().notNull(),
    address: t.hex().notNull(),
    action: t.text().notNull(),
    timestamp: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [
        table.tx,
        table.index,
        table.chainId,
      ],
    }),
  }),
);

export const bountiesRelations = relations(
  bounties,
  ({ many, one }) => ({
    claims: many(claims),
    participants: many(participationsBounties),
    issuer: one(users, {
      fields: [bounties.issuer],
      references: [users.address],
    }),
    transactions: many(transactions),
  }),
);

export const usersRelations = relations(
  users,
  ({ many, one }) => ({
    bounties: many(bounties),
    claims: many(claims),
    participations: many(participationsBounties),
    transactions: many(transactions),
    degenScore: one(degenBoard, {
      fields: [users.address],
      references: [degenBoard.address],
    }),
    baseScore: one(baseBoard, {
      fields: [users.address],
      references: [baseBoard.address],
    }),
    arbitrumScore: one(arbitrumBoard, {
      fields: [users.address],
      references: [arbitrumBoard.address],
    }),
  }),
);

export const claimsRelations = relations(
  claims,
  ({ one }) => ({
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
  }),
);

export const participationsBountiesRelations =
  relations(
    participationsBounties,
    ({ one }) => ({
      user: one(users, {
        fields: [
          participationsBounties.userAddress,
        ],
        references: [users.address],
      }),
      bounty: one(bounties, {
        fields: [participationsBounties.bountyId],
        references: [bounties.id],
      }),
    }),
  );

export const transactionRelations = relations(
  transactions,
  ({ one }) => ({
    user: one(users, {
      fields: [transactions.address],
      references: [users.address],
    }),
    bounties: one(bounties, {
      fields: [transactions.bountyId],
      references: [bounties.id],
    }),
  }),
);

export const degenScoreRelations = relations(
  degenBoard,
  ({ one }) => ({
    user: one(users, {
      fields: [degenBoard.address],
      references: [users.address],
    }),
  }),
);

export const baseScoreRelations = relations(
  baseBoard,
  ({ one }) => ({
    user: one(users, {
      fields: [baseBoard.address],
      references: [users.address],
    }),
  }),
);

export const arbitrumScoreRelations = relations(
  arbitrumBoard,
  ({ one }) => ({
    user: one(users, {
      fields: [arbitrumBoard.address],
      references: [users.address],
    }),
  }),
);
