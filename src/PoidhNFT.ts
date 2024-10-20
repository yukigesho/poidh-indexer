import { ponder } from "@/generated";
import { calcId } from "../utils";

ponder.on("PoidhNFTContract:Transfer", async ({ event, context }) => {
  const { User, Claim } = context.db;
  const { to, tokenId } = event.args;

  const receiver = await User.upsert({ id: to, create: {}, update: {} });

  const url = await context.client.readContract({
    abi: context.contracts.PoidhNFTContract.abi,
    address: context.contracts.PoidhNFTContract.address,
    functionName: "tokenURI",
    args: [tokenId],
    blockNumber: event.block.number + 1n,
  });

  await Claim.upsert({
    id: calcId({ id: tokenId, chainId: context.network.chainId }),
    create: {
      primaryId: tokenId,
      chainId: BigInt(context.network.chainId),
      title: "",
      url,
      description: "",
      bountyId: 0n,
      createdAt: 0n,
      isBanned: false,
      issuerId: "",
      ownerId: receiver.id,
      accepted: false,
    },
    update: {
      ownerId: receiver.id,
    },
  });
});
