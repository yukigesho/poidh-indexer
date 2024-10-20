export function calcId({
  id,
  chainId,
}: {
  id: bigint;
  chainId: bigint | number;
}) {
  return BigInt(chainId) * 100_000n + id;
}
