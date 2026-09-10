import { http, type Transport } from "viem";

export const ERPC_TIMEOUT_MS = 35_000;

/** Keep the client budget above eRPC's 30s budget, even when Ponder passes 10s. */
export function createErpcTransport(url: string, secret: string): Transport {
  const transport = http(url, {
    fetchOptions: { headers: { "X-ERPC-Secret-Token": secret } },
    retryCount: 0,
  });

  return (options) => transport({ ...options, timeout: ERPC_TIMEOUT_MS });
}
