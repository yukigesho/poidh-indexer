# POIDH Indexer

Indexer + API service for [POIDH](https://github.com/picsoritdidnthappen/poidh-app) built with [Ponder](https://ponder.sh), [Hono](https://hono.dev), and PostgreSQL. It ingests on-chain Poidh bounty + NFT events across Base, Degen, and Arbitrum, keeps supplemental USD pricing off-chain, and exposes queryable REST and GraphQL surfaces for the app.

## Table of contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Setup](#setup)
  - [Environment variables](#environment-variables)
  - [Install dependencies](#install-dependencies)
  - [Database](#database)
- [Running locally](#running-locally)
- [Keeping the price feed fresh](#keeping-the-price-feed-fresh)
- [API surface](#api-surface)
  - [REST endpoints](#rest-endpoints)
  - [GraphQL](#graphql)
  - [OpenAPI / Swagger](#openapi--swagger)
  - [Authenticated price refresh endpoint](#authenticated-price-refresh-endpoint)
- [Tracked contracts](#tracked-contracts)
- [Scripts](#scripts)
- [Deployment notes](#deployment-notes)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview
- Mirrors Poidh bounty, claim, participation, transaction, user, leaderboard, and NFT transfer data into Postgres via Ponder handlers.
- Maintains an off-chain USD price table (ETH + DEGEN) so bounties can be sorted by fiat value.
- Serves REST + OpenAPI + Swagger + GraphQL APIs for the Poidh client and external consumers.
- Includes cron + webhook workflows for refreshing prices and optional Neynar-powered notifications.

## Architecture
1. **Indexer** (`src/Poidh.ts`, `src/PoidhNFT.ts`): Ponder event handlers read chain events and populate tables defined in `ponder.schema.ts`.
2. **API** (`src/api`): A Hono app mounts REST resources, OpenAPI docs, Swagger UI, and wires `/graphql` via Ponder's helper.
3. **Off-chain storage** (`offchain.database.ts`, `offchain.schema.ts`): Drizzle ORM keeps historical USD pricing in a lightweight `Price` table.
4. **Helpers** (`src/helpers`): Coinbase price fetchers, Neynar notification utilities, and cron code under `src/cron`.
5. **Configuration** (`ponder.config.ts`): Declares RPC URLs, contract ABIs, addresses, start blocks, and database options.

```
Chain events → Ponder handlers → Postgres tables → REST/GraphQL/OpenAPI → POIDH App
```

## Requirements
- Node.js >= 18.14
- [pnpm](https://pnpm.io/) 8+
- PostgreSQL 14+ reachable via `DATABASE_URL`
- (Optional) [Railway](https://railway.app/) CLI & token for production redeploys
- (Optional) Neynar API key for Farcaster notifications

## Setup

### Environment variables
Create `.env.local` (or `.env`) in the repo root.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres connection string, e.g. `postgresql://user:pass@host:5432/db` |
| `DATABASE_SCHEMA` | ✅ | Schema that stores Ponder + off-chain tables (use `public` or custom) |
| `BASE_RPC_URL` | ✅ | Base mainnet RPC URL |
| `DEGEN_RPC_URL` | ✅ | Degen chain RPC URL (e.g. `https://rpc.degen.tips`) |
| `ARBITRUM_RPC_URL` | ✅ | Arbitrum One RPC URL |
| `SERVER_API_KEY` | ✅ | Shared key for `/updatePrice` |
| `SERVER_SECRET` | ✅ | HMAC secret used to sign `/updatePrice` requests |
| `RAILWAY_TOKEN` | ✅ (prod) | Railway token for automated redeploys |
| `RAILWAY_SERVICE_ID` | ✅ (prod) | Railway service identifier |
| `NEYNAR_API_KEY` | optional | Enables Farcaster notification helpers |

Generate API creds via:

```bash
pnpm generateAPIKey
```

### Install dependencies
```bash
pnpm install
```

### Database
- Ensure the schema in `DATABASE_SCHEMA` exists and the user has DDL permissions.
- Ponder creates `ponder_*` tables automatically; the Drizzle `Price` table is created when the first price row is inserted.
- For local Postgres you can use tools like `psql` or Docker; just make sure `DATABASE_URL` works for both the indexer and API.

## Running locally
```bash
pnpm dev        # Ponder dev server + Hono API (default http://localhost:42069)
pnpm start      # Production start (after `ponder build`)
pnpm codegen    # Regenerate TS types + GraphQL schema after schema changes
pnpm lint       # ESLint
pnpm typecheck  # tsc --noEmit
```

Ponder exposes `/graphql`, `/openapi/doc`, and `/swagger` while running.

## Keeping the price feed fresh
1. **Cron script**: `pnpm update-price` hits Coinbase for ETH + DEGEN USD rates and inserts rows when either price moves >= 3% since the last stored value.
2. **Webhook**: `POST /updatePrice` performs the same work but requires API headers and, on success, shells out to `pnpm redeploy --service <SERVICE_ID>` so Railway restarts the service.
3. Schedule either mechanism (e.g. every 5 minutes) so `amountSort` stays current.

## API surface

### REST endpoints
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/bounty/:chainId` | All bounties for a chain |
| `GET` | `/bounty/:chainId/:bountyId` | Single bounty |
| `GET` | `/bounty/participations/:chainId/:bountyId` | Addresses + stake amounts |
| `GET` | `/bounty/claims/:chainId/:bountyId` | Claims tied to a bounty |
| `GET` | `/live/bounty/:chainId` | In-progress bounties |
| `GET` | `/voting/bounty/:chainId` | Bounties in voting phase |
| `GET` | `/past/bounty/:chainId` | Completed bounties |
| `GET` | `/claim/:chainId` | All claims for a chain |
| `GET` | `/claim/:chainId/:claimId` | Single claim |
| `GET` | `/swagger` | Swagger UI |
| `GET` | `/openapi/doc` | OpenAPI 3.0 spec JSON |
| `GET/POST` | `/graphql` | Ponder GraphQL endpoint |
| `POST` | `/updatePrice` | Authenticated price refresh + redeploy |

### GraphQL
Use `/graphql` (see `generated/schema.graphql`). Example query:

```graphql
query LatestBounties($chainId: Int!) {
  bounties(
    where: { chainId: { equals: $chainId } }
    orderBy: [{ createdAt: DESC }]
    take: 20
  ) {
    id
    title
    amount
    issuer
    claims(orderBy: [{ id: ASC }]) {
      id
      issuer
      isAccepted
    }
  }
}
```

### OpenAPI / Swagger
- `GET /openapi/doc` provides machine-readable docs (schemas live in `src/openapi`).
- `GET /swagger` serves a UI via `@hono/swagger-ui` for testing endpoints manually.

### Authenticated price refresh endpoint
Headers required when calling `POST /updatePrice`:

| Header | Purpose |
| --- | --- |
| `x-api-key` | Must equal `SERVER_API_KEY` |
| `x-timestamp` | Unix seconds; request expires after 5 minutes |
| `x-signature` | Hex HMAC-SHA256 of `METHOD|PATH|timestamp|body` using `SERVER_SECRET` |

If validation passes and the price delta threshold is met, the new prices are inserted and the Railway redeploy command runs.

## Tracked contracts
| Chain | ID | Poidh contract | Start block | NFT contract | Start block |
| --- | --- | --- | --- | --- | --- |
| Base | 8453 | `0xb502c5856F7244DccDd0264A541Cc25675353D39` | 14,542,727 | `0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80` | 14,542,570 |
| Degen | 666666666 | `0x2445BfFc6aB9EEc6C562f8D7EE325CddF1780814` | 6,991,084 | `0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80` | 4,857,281 |
| Arbitrum | 42161 | `0x0Aa50ce0d724cc28f8F7aF4630c32377B4d5c27d` | 211,898,523 | `0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80` | 211,898,311 |

Update `ponder.config.ts` if you need to change addresses or rewind history.

## Scripts
| Command | Description |
| --- | --- |
| `pnpm dev` | Run indexers + API locally with hot reload |
| `pnpm start` | Launch production server |
| `pnpm codegen` | Regenerate types + GraphQL schema |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript project check |
| `pnpm update-price` | Manual price refresh via Coinbase |
| `pnpm generateAPIKey` | Generate API + secret pair |
| `pnpm redeploy` | Railway redeploy helper (needs `RAILWAY_TOKEN`) |

## Deployment notes
- The dev server binds to `0.0.0.0:42069` by default; configure via Ponder env vars as needed.
- `/updatePrice` expects Railway creds; adapt the command if you deploy elsewhere.
- Neynar notifications stay disabled unless `NEYNAR_API_KEY` is set; integration lives in `src/helpers/notifications.ts`.
- Remember to run `pnpm codegen` whenever `ponder.schema.ts` changes so types stay aligned.

## Troubleshooting
- **Database connection errors**: Verify `DATABASE_URL` + `DATABASE_SCHEMA` and that the user has permission to create tables.
- **Missing events**: Use archive RPC URLs and confirm `ponder.config.ts` start blocks cover the history you need.
- **USD sort stuck at zero**: Run `pnpm update-price` once to seed the table; make sure Coinbase responses include USD rates.
- **Signature mismatch on /updatePrice**: Double-check the canonical string and that `x-timestamp` is within 300 seconds.
- **Swagger showing static data**: Those are examples; hit the REST endpoints directly for live data.

## License
[MIT](LICENSE)
