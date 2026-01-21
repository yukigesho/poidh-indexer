import { desc } from "drizzle-orm";
import offchainDatabase from "../../offchain.database";
import { priceTable } from "../../offchain.schema";

type Currency = "eth" | "degen";
type PriceRow = typeof priceTable.$inferSelect;

let cachedPrice: PriceRow | null = null;

export async function fetchPrice({ currency }: { currency: Currency }) {
  let retries = 5;
  while (true) {
    try {
      const response = await fetch(
        `https://api.coinbase.com/v2/exchange-rates?currency=${currency}`,
      );
      const body = await response.json();
      const price = (body as any).data.rates.USD;
      if (!price) {
        throw new Error(`USD price not found… attempts left: ${retries}`);
      }
      return Number(price);
    } catch (e) {
      if (--retries === 0) {
        throw new Error("Can not fetch price");
      }
      console.error(e);
    }
  }
}

export function getCurrencyByChainId({
  chainId,
}: {
  chainId: number;
}): Currency {
  if (chainId === 666666666) {
    return "degen";
  }
  return "eth";
}

export async function loadLatestPrice() {
  cachedPrice = await getLatestPrice();
  return cachedPrice;
}

export async function refreshLatestPrice() {
  cachedPrice = await getLatestPrice();
  return cachedPrice;
}

export function setPrice(price: PriceRow | null) {
  cachedPrice = price;
}

export function getPrice() {
  return cachedPrice;
}

export function priceBasedOnChainId(chainId: number) {
  if (!cachedPrice) {
    throw new Error("Price not loaded");
  }

  return chainId === 666666666
    ? Number(cachedPrice.degen_usd)
    : Number(cachedPrice.eth_usd);
}

export async function getLatestPrice() {
  const [price] = await offchainDatabase
    .select()
    .from(priceTable)
    .orderBy(desc(priceTable.id))
    .limit(1);

  return price ?? null;
}
