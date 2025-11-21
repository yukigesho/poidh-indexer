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
    userAddress: z.string(),
  })
  .openapi("Participation");

export const BountiesSchema = z.array(BountySchema).openapi("Bounties");

export const ClaimsSchema = z.array(ClaimSchema).openapi("Claims");

export const ParticipationsSchema = z
  .array(ParticipationSchema)
  .openapi("Participations");

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
