# POIDH Indexer

On-chain indexer for [POIDH](https://github.com/picsoritdidnthappen/poidh-app), built with [Ponder](https://ponder.sh) and PostgreSQL. It ingests Poidh bounty and NFT events across Base, Arbitrum, and Ethereum mainnet.

This service writes indexed data to PostgreSQL. It does not expose application REST, GraphQL, OpenAPI, or Swagger endpoints. Consumers should access the database through a separate service.

## Architecture

- **Indexer** (`src/Poidh.ts`, `src/PoidhNFT.ts`, `src/legacy`): Event handlers populate tables defined in `ponder.schema.ts`.
- **Off-chain storage** (`offchain.database.ts`, `offchain.schema.ts`): Supplemental USD pricing storage.
- **Helpers** (`src/helpers`): Price fetchers, notification utilities, and shared indexing helpers.
- **Configuration** (`ponder.config.ts`): RPC URLs, contract ABIs, addresses, and indexing block ranges.
- **Ponder app** (`src/api/index.ts`): An empty Hono app required by Ponder 0.17. It registers no application routes.

```text
Chain events → Ponder handlers → PostgreSQL → Separate consuming service
```

## Setup

Requirements: Node.js >= 18.14, pnpm, and PostgreSQL 14+.

Copy `.env.local.example` to `.env.local` and configure:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_SCHEMA` | Ponder database schema; required for production (or pass `--schema`) |
| `ERPC_URL` | eRPC origin without a path suffix |
| `ERPC_AUTH_SECRET` | eRPC secret sent as `X-ERPC-Secret-Token` |
| `NEYNAR_API_KEY` | Optional Farcaster notification credentials |

All chain RPC requests use `${ERPC_URL}/main/evm/<chainId>` with secret-token authentication. On Railway's private network, the origin can be `http://erpc.railway.internal:4000`. Keep credentials out of Git.

```bash
pnpm install
pnpm dev        # Indexing with hot reload
pnpm start      # Production indexing
pnpm codegen    # Regenerate Ponder types
pnpm typecheck  # TypeScript project check
pnpm lint       # ESLint
```

## Deployment notes

Ponder still starts its built-in HTTP server (port `42069` by default) for operational endpoints such as `/health`, `/ready`, `/status`, and `/metrics`. Removing application routes does not disable this server. Keep the service on a private network; no public API domain is needed. Configure the bind address and port with Ponder's `--hostname` and `--port` flags.

The former bounty/claim REST routes, `/graphql`, `/openapi/doc`, and `/swagger` are not registered and return 404. There is no `/updatePrice` webhook or API-key generation workflow.

Use `pnpm redeploy` with Railway credentials if deploying through the Railway CLI.

## Tracked contracts

Current V3 deployments on Base, Arbitrum, and Ethereum mainnet, plus legacy deployments and their block ranges, are defined in `ponder.config.ts`. Degen is no longer indexed; historical Degen database fields remain for compatibility.

## Troubleshooting

- **Database connection errors**: Verify the database URL, schema, and database user permissions.
- **Missing events**: Check RPC availability and the contract start/end blocks in `ponder.config.ts`.
- **Schema changes**: Run `pnpm codegen` after editing `ponder.schema.ts`.
