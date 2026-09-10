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
pnpm test       # Offline runtime configuration tests + loopback HTTP test
pnpm lint       # ESLint
```

## Deployment notes

Ponder still starts its built-in HTTP server (port `42069` by default) for operational endpoints such as `/health`, `/ready`, `/status`, and `/metrics`. Removing application routes does not disable this server. Keep the service on a private network; no public API domain is needed. Configure the bind address and port with Ponder's `--hostname` and `--port` flags.

The former bounty/claim REST routes, `/graphql`, `/openapi/doc`, and `/swagger` are not registered and return 404. There is no `/updatePrice` webhook or API-key generation workflow.

Use `pnpm redeploy` with Railway credentials if deploying through the Railway CLI.

## Reliability and monitoring

### RPC timeout

`src/helpers/erpc.ts` enforces a **35-second instantiated transport timeout**, above eRPC's 30-second total request budget. Ponder 0.17.10 supplies its own 10-second timeout when constructing transports, so setting only `http(url, { timeout: 35000 })` is insufficient. Viem retries remain disabled; eRPC and Ponder retain their own recovery behavior. This does not change eRPC's 3-second upstream timeout or add another provider.

### Off-chain PostgreSQL connection

Use the HA cluster's private **writer endpoint** in `DATABASE_URL`, not a fixed database member or read-only endpoint. URL parameters are preserved unchanged; `offchain.schema.ts` qualifies table names using the existing `DATABASE_SCHEMA` setting.

The off-chain pool (separate from Ponder's own pools) allows at most **5 connections per process**, with a 5s connection/acquisition timeout, 15s server statement timeout, 20s client query timeout, 30s idle expiry, and TCP keepalive. Idle connection errors are handled and failed clients replaced on subsequent requests. Idle sockets do not keep the process alive.

Failed queries still propagate to the caller; they are **not silently dropped or automatically replayed**. Writes may have committed before a connection fails, so blind retries could duplicate notifications. This pool is not an exactly-once outbox, and handlers still depend on off-chain storage. Test a controlled DB failover in staging before relying on recovery in production. Account for Ponder's pools plus this pool, other services, and overlapping deployments when sizing DB connection limits.

### Railway / Prometheus

The sibling `../erpc` monitoring stack now scrapes `indexer.railway.internal:42069/metrics`. Confirm the actual private hostname matches (edit `../erpc/monitoring/prometheus.yml` if not). Set Railway `PORT=42069` and start with:

```bash
pnpm start --schema=$RAILWAY_DEPLOYMENT_ID --views-schema=public --hostname :: --port 42069
```

Keep `DATABASE_SCHEMA=public` for off-chain tables. The CLI `--schema` selects Ponder's deployment-specific schema; `--views-schema=public` publishes its indexed tables through stable views for the REST API. Use one active writer per deployment schema. This preserves the existing deployment/views arrangement; no schema migration is introduced. Binding to `::` supports Railway private IPv6 networking and dual-stack IPv4 on the usual Linux setup. Keep operational endpoints private. Use `/ready` for the deployment healthcheck (up to 3600s for backfill), but remember Railway does not continuously poll it after deployment.

Redeploy Prometheus after updating its config/image. In Grafana Explore, verify `up{job="ponder"} == 1` and chain labels `base`, `arbitrum`, and `main`. Useful Ponder 0.17.10 queries:

```promql
time() - ponder_sync_block_timestamp{job="ponder"}
time() - ponder_indexing_timestamp{job="ponder"}
ponder_sync_block_timestamp{job="ponder"} - ponder_indexing_timestamp{job="ponder"}
```

The eRPC repo includes tested rules for endpoint unavailability, sync lag, and handler lag. Prometheus evaluates these rules, but **notification delivery requires Alertmanager or Grafana-managed alerts and a contact point**; see its monitoring README. No automatic restarts are configured.

Before restarting a stalled instance, capture `/status` twice 30 seconds apart, `/metrics`, and logs. Advancing sync with stalled indexing suggests handlers/DB; stalled sync suggests RPC; current database rows with stale API responses suggest the API cache or schema/replica selection.

## Tracked contracts

Current V3 deployments on Base, Arbitrum, and Ethereum mainnet, plus legacy deployments and their block ranges, are defined in `ponder.config.ts`. Degen is no longer indexed; historical Degen database fields remain for compatibility.

## Troubleshooting

- **Database connection errors**: Verify the database URL, schema, and database user permissions.
- **Missing events**: Check RPC availability and the contract start/end blocks in `ponder.config.ts`.
- **Schema changes**: Run `pnpm codegen` after editing `ponder.schema.ts`.
