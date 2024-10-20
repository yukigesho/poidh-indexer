import { createSchema } from "@ponder/core";

export default createSchema((p) => ({
  Bounty: p.createTable(
    {
      id: p.bigint(),

      primaryId: p.bigint(),
      chainId: p.bigint(),

      title: p.string(),
      description: p.string(),
      amount: p.string(),
      issuer: p.string().references("User.id"),
      createdAt: p.bigint(),
      inProgress: p.boolean(),
      isCanceled: p.boolean().optional(),
      isBanned: p.boolean(),
      isMultiplayer: p.boolean().optional(),
      isVoting: p.boolean().optional(),
      deadline: p.int().optional(),

      claims: p.many("Claim.bountyId"),
      participants: p.many("ParticipantBounty.bountyId"),
    },
    {
      chainIdIndex: p.index("chainId"),
      primaryIdIndex: p.index("primaryId"),
    }
  ),

  User: p.createTable({
    id: p.string(), // address as id

    ens: p.string().optional(),
    degenName: p.string().optional(),

    bounties: p.many("Bounty.issuer"),
    participations: p.many("ParticipantBounty.userId"),
    claims: p.many("Claim.issuerId"),
  }),

  ParticipantBounty: p.createTable({
    id: p.bigint(),
    amount: p.string(),
    userId: p.string().references("User.id"),
    bountyId: p.bigint().references("Bounty.id"),

    user: p.one("userId"),
    bounty: p.one("bountyId"),
  }),

  Claim: p.createTable({
    id: p.bigint(),

    primaryId: p.bigint(),
    chainId: p.bigint(),

    title: p.string(),
    url: p.string(),
    description: p.string(),
    createdAt: p.bigint(),
    isBanned: p.boolean(),
    ownerId: p.string(),
    accepted: p.boolean(),

    bountyId: p.bigint().references("Bounty.id"),
    issuerId: p.string().references("User.id"),

    issuer: p.one("issuerId"),
    bounty: p.one("bountyId"),
  }),
}));
