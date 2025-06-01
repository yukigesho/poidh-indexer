import { ponder } from "ponder:registry";
import { claims, users } from "../ponder.schema";

ponder.on(
  "PoidhNFTContract:Transfer",
  async ({ event, context }) => {
    const database = context.db;
    const { to, tokenId } = event.args;

    await database
      .insert(users)
      .values({ address: to })
      .onConflictDoNothing();

    const url = await context.client.readContract(
      {
        abi: context.contracts.PoidhNFTContract
          .abi,
        address:
          context.contracts.PoidhNFTContract
            .address,
        functionName: "tokenURI",
        args: [tokenId],
        blockNumber: event.block.number,
      },
    );

    await database
      .insert(claims)
      .values({
        id: Number(tokenId),
        chainId: context.chain.id,
        title: "",
        description: "",
        url,
        bountyId: 0,
        owner: to,
        issuer: to,
      })
      .onConflictDoUpdate({
        owner: to,
      });
  },
);
