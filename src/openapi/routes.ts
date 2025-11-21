import { createRoute } from "@hono/zod-openapi";
import {
  BountiesSchema,
  BountySchema,
  ClaimsSchema,
  GetByChainId,
  GetByBountyIdAndChainIdParamsSchema,
  ParticipationsSchema,
  GetByClaimIdAndChainIdParamsSchema,
  ClaimSchema,
} from "./schemas";

export const getChainBountiesRoute = createRoute({
  method: "get",
  path: "/bounty/{chainId}",
  request: {
    params: GetByChainId,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: BountiesSchema,
        },
      },
      description: "Retrieve bounties",
    },
  },
});

export const getVotingBountiesRoute = createRoute({
  method: "get",
  path: "/voting/bounty/{chainId}",
  request: {
    params: GetByChainId,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: BountiesSchema,
        },
      },
      description: "Retrieve bounties with voting in progress",
    },
  },
});

export const getPastBountiesRoute = createRoute({
  method: "get",
  path: "/past/bounty/{chainId}",
  request: {
    params: GetByChainId,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: BountiesSchema,
        },
      },
      description: "Retrieve completed bounties",
    },
  },
});

export const getLiveBountiesRoute = createRoute({
  method: "get",
  path: "/live/bounty/{chainId}",
  request: {
    params: GetByChainId,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: BountiesSchema,
        },
      },
      description: "Retrieve in progress bounties",
    },
  },
});

export const getBountyRoute = createRoute({
  method: "get",
  path: "/bounty/{chainId}/{bountyId}",
  request: {
    params: GetByBountyIdAndChainIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: BountySchema,
        },
      },
      description: "Retrieve a bounty",
    },
  },
});

export const getBountyParticipationsRouter = createRoute({
  method: "get",
  path: "/bounty/participations/{chainId}/{bountyId}",
  request: {
    params: GetByBountyIdAndChainIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ParticipationsSchema,
        },
      },
      description: "Retrieve the participations for the bounty",
    },
  },
});

export const getBountyClaimsRoute = createRoute({
  method: "get",
  path: "/bounty/claims/{chainId}/{bountyId}",
  request: {
    params: GetByBountyIdAndChainIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ClaimsSchema,
        },
      },
      description: "Retrieve the claims for the bounty",
    },
  },
});

export const getChainClaimsRoute = createRoute({
  method: "get",
  path: "/claim/{chainId}",
  request: {
    params: GetByChainId,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ClaimsSchema,
        },
      },
      description: "Retrieve claims",
    },
  },
});

export const getClaimRoute = createRoute({
  method: "get",
  path: "/claim/{chainId}/{claimId}",
  request: {
    params: GetByClaimIdAndChainIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ClaimSchema,
        },
      },
      description: "Retrieve a claim",
    },
  },
});
