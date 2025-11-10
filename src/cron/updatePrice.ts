import { desc } from "drizzle-orm";
import database from "../../offchain.database";
import { priceTable } from "../../offchain.schema";
import { fetchPrice } from "../helpers/price";

async function main() {
  const [latestPrice] = await database
    .select()
    .from(priceTable)
    .orderBy(desc(priceTable.id))
    .limit(1);

  const [currentPriceETH, currentPriceDegen] =
    await Promise.all([
      fetchPrice({
        currency: "eth",
      }),
      fetchPrice({
        currency: "degen",
      }),
    ]);

  const percent = ({
    current,
    previous,
  }: {
    current: number;
    previous: number;
  }) => {
    if (previous === 0) {
      throw new Error("Previous price === 0");
    }
    return Math.abs(
      ((current - previous) / previous) * 100,
    );
  };

  const shouldUpdatePrice =
    !latestPrice ||
    percent({
      current: currentPriceETH,
      previous: Number(latestPrice.eth_usd),
    }) > 3 ||
    percent({
      current: currentPriceDegen,
      previous: Number(latestPrice.degen_usd),
    }) > 3;

  if (!shouldUpdatePrice) {
    return 0;
  }

  await database.insert(priceTable).values({
    eth_usd: currentPriceETH.toString(),
    degen_usd: currentPriceDegen.toString(),
  });

  return 0;
}

if (
  import.meta.url === `file://${process.argv[1]}`
) {
  main()
    .then(() => {
      console.log(
        "update prices finished with code 0",
      );
      process.exit(0);
    })
    .catch((e) => {
      console.error("Something went wrong!", e);
      process.exit(1);
    });
}
