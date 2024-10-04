import { createSchema } from "@ponder/core";

export default createSchema((p) => ({
  Bounty: p.createTable({
    id: p.bigint(),
    issuerId: p.string().references("User.id"),
    chainId: p.int(),
    title: p.string(),
    description: p.string(),
    amount: p.bigint(),
    createdAt: p.bigint(),
    inProgress: p.boolean(),
    isBanned: p.boolean(),

    winnerClaimId: p.bigint().references("Claim.id").optional(),
    isMultiplayer: p.boolean().optional(),
    yes: p.bigint().optional(),
    no: p.bigint().optional(),
    deadline: p.bigint().optional(),

    claims: p.many("Claim.bountyId"),
    votes: p.many("Vote.bountyId"),
    participants: p.many("ParticipantBounty.bountyId"),

    issuer: p.one("issuerId"),
    winnerClaim: p.one("winnerClaimId"),
  }),

  User: p.createTable({
    id: p.string(), // address as id

    ens: p.string().optional(),
    degenName: p.string().optional(),

    bounties: p.many("Bounty.issuerId"),
    participations: p.many("ParticipantBounty.userId"),
    claims: p.many("Claim.issuerId"),
  }),

  ParticipantBounty: p.createTable({
    id: p.bigint(),
    userId: p.string().references("User.id"),
    bountyId: p.bigint().references("Bounty.id"),

    user: p.one("userId"),
    bounty: p.one("bountyId"),
  }),

  VoteValue: p.createEnum(["yes", "no"]),

  Vote: p.createTable({
    id: p.string(),
    vote: p.enum("VoteValue"),
    claimId: p.bigint().references("Claim.id"),
    userId: p.string().references("User.id"),
    bountyId: p.bigint().references("Bounty.id"),

    claim: p.one("claimId"),
    user: p.one("userId"),
    bounty: p.one("bountyId"),
  }),

  Claim: p.createTable({
    id: p.bigint(),
    bountyId: p.bigint().references("Bounty.id"),
    issuerId: p.string().references("User.id"),
    title: p.string(),
    url: p.string(),
    description: p.string(),
    createdAt: p.bigint(),
    isBanned: p.boolean(),
    ownerId: p.string().references("User.id").optional(),

    issuer: p.one("issuerId"),
    bounty: p.one("bountyId"),
    owner: p.one("ownerId"),
  }),
}));
