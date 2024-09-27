import { createSchema } from "@ponder/core";

export default createSchema((p) => ({
  Bounty: p.createTable({
    id: p.int(),
    issuerId: p.int().references("User.id"),
    chainId: p.int(),
    title: p.string(),
    description: p.string(),
    amount: p.string(),
    createdAt: p.int(),
    isMultiplayes: p.boolean(),
    inProgress: p.boolean(),
    isBanned: p.boolean(),

    claims: p.many("Claim.bountyId"),
    issuer: p.one("issuerId"),
  }),

  User: p.createTable({
    id: p.int(),
    address: p.string(),
    ens: p.string().optional(),
    degenName: p.string().optional(),

    bounties: p.many("Bounty.issuerId"),
    claims: p.many("Claim.issuerId"),
  }),

  Claim: p.createTable({
    id: p.int(),
    bountyId: p.int().references("Bounty.id"),
    issuerId: p.int().references("User.id"),
    title: p.string(),
    description: p.string(),
    createdAt: p.int(),
    isBanned: p.boolean(),

    issuer: p.one("issuerId"),
    bounty: p.one("bountyId"),
  }),
}));
