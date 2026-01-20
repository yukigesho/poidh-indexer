import { z } from "@hono/zod-openapi";

export const BountySchema = z
  .object({
    id: z.number().openapi({
      example: 1337,
      description: "Bounty ID",
    }),
    chainId: z.number().openapi({
      example: 8453,
      description: "Chain ID",
    }),
    onChainId: z.number().openapi({
      example: 12,
      description: "On-chain bounty ID",
    }),
    createdAt: z.number().openapi({
      example: 1713370239,
      description: "Created timestamp",
    }),
    title: z.string().openapi({
      example: "Find a bug",
      description: "Bounty title",
    }),
    description: z.string().openapi({
      example: "Find a bug in the code",
      description: "Bounty description",
    }),
    amount: z.string().openapi({
      example: "13370000000",
      description: "Bounty amount (bigint)",
    }),
    amountSort: z.number().openapi({
      example: 1337,
      description: "Bounty amount (decimal)",
    }),
    issuer: z.string().openapi({
      example: "0x1337567890abcdef",
      description: "Bounty issuer address",
    }),
    inProgress: z.boolean().openapi({
      example: false,
      default: true,
      description: "Is the bounty in progress",
    }),
    isJoinedBounty: z.boolean().openapi({
      example: false,
      default: false,
      description: "Is the bounty joined",
    }),
    isCanceled: z.boolean().openapi({
      example: false,
      description: "Is the bounty canceled",
      default: false,
    }),
    isMultiplayer: z.boolean().openapi({
      example: false,
      description: "Is a multiplayer bounty",
    }),
    isVoting: z.boolean().openapi({
      example: false,
      description: "Is voting in progress",
      default: false,
    }),
    deadline: z.number().nullable().openapi({
      example: 1713370239,
      description: "Voting deadline",
    }),
  })
  .openapi("Bounty");

export const BountyWithParticipantsSchema = BountySchema.extend({
  participants: z.array(z.string()).openapi({
    example: [
      "0x01a29134723ef72a968838cb1df498bc4f910bec",
      "0x0e467a0288a439ba2678eb7d3b0b64b01e2bbbfc",
    ],
    description: "Participant addresses",
  }),
}).openapi("BountyWithParticipants");

export const ClaimSchema = z
  .object({
    id: z.number().openapi({
      example: 777,
      description: "Claim id",
    }),
    chainId: z.number().openapi({
      example: 8453,
      description: "Chain ID",
    }),
    onChainId: z.number().openapi({
      example: 44,
      description: "On-chain claim ID",
    }),
    bountyId: z.number().openapi({
      example: 1337,
      description: "Bounty ID",
    }),
    title: z.string().openapi({
      example: "Find a bug",
      description: "Bounty title",
    }),
    description: z.string().openapi({
      example: "Find a bug in the code",
      description: "Bounty description",
    }),
    url: z.string().openapi({
      example:
        "https://images.pexels.com/photos/11129937/pexels-photo-11129937.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      description: "Claim image url",
    }),
    issuer: z.string().openapi({
      example: "0x1337567890abcdef",
      description: "Claim issuer address",
    }),
    isAccepted: z.boolean().openapi({
      example: true,
      description: "Is claim accepted",
      default: false,
    }),
    isVoting: z.boolean().openapi({
      example: false,
      description: "Is claim in voting",
      default: false,
    }),
    owner: z.string().openapi({
      example: "0x1337567890abcdef",
      description: "NFT owner address",
    }),
  })
  .openapi("Claim");

export const ParticipationSchema = z
  .object({
    amount: z.string(),
    bountyId: z.number(),
    chainId: z.number(),
    userAddress: z.string(),
  })
  .openapi("Participation");

export const BountiesSchema = z.array(BountySchema).openapi("Bounties");

export const ClaimsSchema = z.array(ClaimSchema).openapi("Claims");

export const ParticipationsSchema = z
  .array(ParticipationSchema)
  .openapi("Participations");

export const AddressSchema = z.string().openapi({
  example: "0xbed82560c39c133a3d64516ecda82c71b72f3cd7",
  description: "Ethereum address",
});

export const NotificationBountySchema = z
  .object({
    id: z.number().openapi({
      example: 1337,
      description: "Bounty ID",
    }),
    chainId: z.number().openapi({
      example: 8453,
      description: "Chain ID",
    }),
    onChainId: z.number().openapi({
      example: 1,
      description: "On-chain bounty ID",
    }),
    title: z.string().openapi({
      example: "Find a bug",
      description: "Bounty title",
    }),
    description: z.string().openapi({
      example: "Find a bug in the code",
      description: "Bounty description",
    }),
    amount: z.number().openapi({
      example: 1337,
      description: "Bounty amount in currency",
    }),
    issuer: AddressSchema,
    createdAt: z.number().openapi({
      example: 1713370239,
      description: "Created timestamp",
    }),
    inProgress: z.boolean().openapi({
      example: true,
      description: "Is the bounty in progress",
    }),
    isJoinedBounty: z.boolean().openapi({
      example: false,
      description: "Is the bounty joined",
    }),
    isCanceled: z.boolean().openapi({
      example: false,
      description: "Is the bounty canceled",
    }),
    isMultiplayer: z.boolean().openapi({
      example: false,
      description: "Is a multiplayer bounty",
    }),
    isVoting: z.boolean().openapi({
      example: false,
      description: "Is voting in progress",
    }),
    deadline: z.number().nullable().openapi({
      example: 1730000000,
      description: "Voting deadline",
    }),
    currency: z.string().openapi({
      example: "eth",
      description: "Currency symbol",
    }),
  })
  .openapi("NotificationBounty");

export const NotificationBountyWithParticipantsSchema =
  NotificationBountySchema.extend({
    participants: z.array(AddressSchema).openapi({
      example: [
        "0x01a29134723ef72a968838cb1df498bc4f910bec",
        "0x0e467a0288a439ba2678eb7d3b0b64b01e2bbbfc",
      ],
      description: "Participant addresses",
    }),
  }).openapi("NotificationBountyWithParticipants");

export const NotificationClaimSchema = z
  .object({
    id: z.number().openapi({
      example: 777,
      description: "Claim ID",
    }),
    chainId: z.number().openapi({
      example: 8453,
      description: "Chain ID",
    }),
    onChainId: z.number().openapi({
      example: 55,
      description: "On-chain claim ID",
    }),
    bountyId: z.number().openapi({
      example: 1337,
      description: "Bounty ID",
    }),
    title: z.string().openapi({
      example: "Find a bug",
      description: "Claim title",
    }),
    description: z.string().openapi({
      example: "Found a critical bug in the code",
      description: "Claim description",
    }),
    url: z.string().openapi({
      example:
        "https://images.pexels.com/photos/11129937/pexels-photo-11129937.jpeg",
      description: "Claim image url",
    }),
    issuer: AddressSchema,
    owner: AddressSchema,
    isVoting: z.boolean().openapi({
      example: false,
      description: "Is claim in voting",
    }),
    isAccepted: z.boolean().openapi({
      example: false,
      description: "Is claim accepted",
    }),
  })
  .openapi("NotificationClaim");

export const BountyCreatedEventSchema = z
  .object({
    event: z.literal("BountyCreated"),
    data: NotificationBountySchema,
  })
  .openapi("BountyCreatedEvent");

export const BountyJoinedEventSchema = z
  .object({
    event: z.literal("BountyJoined"),
    data: z.object({
      participant: z.object({
        address: AddressSchema,
        amount: z.number().openapi({
          example: 12.34,
          description: "Contribution amount in currency",
        }),
      }),
      bounty: NotificationBountyWithParticipantsSchema,
    }),
  })
  .openapi("BountyJoinedEvent");

export const ClaimCreatedEventSchema = z
  .object({
    event: z.literal("ClaimCreated"),
    data: z.object({
      bounty: NotificationBountyWithParticipantsSchema,
      claim: NotificationClaimSchema,
    }),
  })
  .openapi("ClaimCreatedEvent");

export const ClaimAcceptedEventSchema = z
  .object({
    event: z.literal("ClaimAccepted"),
    data: z.object({
      bounty: NotificationBountyWithParticipantsSchema,
      claim: NotificationClaimSchema,
    }),
  })
  .openapi("ClaimAcceptedEvent");

export const VotingStartedEventSchema = z
  .object({
    event: z.literal("VotingStarted"),
    data: z.object({
      bounty: NotificationBountyWithParticipantsSchema,
      claim: NotificationClaimSchema,
      otherClaimers: z.array(AddressSchema).openapi({
        example: [
          "0x18cefa841bdc634dcd640049505dbd8ae22e312f",
          "0x2cd1353cf0e402770643b54011a63b546a189c44",
        ],
        description: "Other claimer addresses",
      }),
    }),
  })
  .openapi("VotingStartedEvent");

export const NotificationEventSchema = z
  .discriminatedUnion("event", [
    BountyCreatedEventSchema,
    BountyJoinedEventSchema,
    ClaimCreatedEventSchema,
    ClaimAcceptedEventSchema,
    VotingStartedEventSchema,
  ])
  .openapi("NotificationEvent");

export const NotificationEventsSchema = z
  .array(NotificationEventSchema)
  .openapi("NotificationEvents");

export const GetByChainId = z.object({
  chainId: z.number().openapi({
    param: {
      name: "chainId",
      in: "path",
    },
    example: 8453,
  }),
});

export const GetByBountyIdAndChainIdParamsSchema = z.object({
  chainId: z.number().openapi({
    param: {
      name: "chainId",
      in: "path",
    },
    example: 8453,
  }),
  bountyId: z.number().openapi({
    param: {
      name: "bountyId",
      in: "path",
    },
    example: 332,
  }),
});

export const GetByClaimIdAndChainIdParamsSchema = z.object({
  chainId: z.number().openapi({
    param: {
      name: "chainId",
      in: "path",
    },
    example: 8453,
  }),
  claimId: z.number().openapi({
    param: {
      name: "claimId",
      in: "path",
    },
    example: 777,
  }),
});
