type Currency = "eth" | "degen";

export async function fetchPrice({
  currency,
}: {
  currency: Currency;
}) {
  let retries = 5;
  while (true) {
    try {
      const response = await fetch(
        `https://api.coinbase.com/v2/exchange-rates?currency=${currency}`,
      );
      const body = await response.json();
      const price = (body as any).data.rates.USD;
      if (!price) {
        throw new Error(
          `USD price not found… attempts left: ${retries}`,
        );
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
