export function isLive(block: bigint) {
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const maxDrift = 60n;

  return nowSec - block <= maxDrift;
}
