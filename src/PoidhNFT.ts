import { ponder } from "@/generated";

ponder.on("PoidhNFTContract:Transfer", async ({ event, context }) => {
  const { User, Claim } = context.db;
  const { from, to, tokenId } = event.args;

  const receiver = await User.upsert({ id: to, create: {}, update: {} });
  const sender = await User.upsert({ id: from, create: {}, update: {} });

  await Claim.update({
    id: tokenId + BigInt(context.network.chainId),
    data: {
      ownerId: receiver.id,
    },
  }).catch(() => console.log(`Claim ${tokenId} minted`));
});
