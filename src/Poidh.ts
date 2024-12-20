import { ponder } from "@/generated";
import {
  bounties,
  claims,
  participationsBounties,
  users,
} from "../ponder.schema";
import { formatEther } from "viem";

ponder.on("PoidhContract:BountyCreated", async ({ event, context }) => {
  const database = context.db;
  const { id, name, amount, issuer, description } = event.args;

  await database
    .insert(users)
    .values({ address: issuer })
    .onConflictDoNothing();

  const isMultiplayer =
    (
      await context.client.readContract({
        abi: context.contracts.PoidhContract.abi,
        address: context.contracts.PoidhContract.address,
        functionName: "getParticipants",
        args: [id],
      })
    )[0].length > 0;

  await database.insert(bounties).values({
    id: Number(id),
    chainId: context.network.chainId,
    title: name,
    description: description,
    amount: amount.toString(),
    amountSort: Number(formatEther(amount)),
    issuer,
    isMultiplayer,
  });

  await database.insert(participationsBounties).values({
    userAddress: issuer,
    bountyId: Number(id),
    amount: amount.toString(),
    chainId: context.network.chainId,
  });
});

ponder.on("PoidhContract:BountyCancelled", async ({ event, context }) => {
  const database = context.db;
  const { bountyId } = event.args;

  await database
    .update(bounties, {
      id: Number(bountyId),
      chainId: context.network.chainId,
    })
    .set({
      isCanceled: true,
      inProgress: false,
    });
});

ponder.on("PoidhContract:BountyJoined", async ({ event, context }) => {
  const database = context.db;
  const { amount, participant, bountyId } = event.args;
  const { client, contracts } = context;

  await database
    .insert(users)
    .values({ address: participant })
    .onConflictDoNothing();

  const [_, __, deadline] = await client.readContract({
    abi: contracts.PoidhContract.abi,
    address: contracts.PoidhContract.address,
    functionName: "bountyVotingTracker",
    args: [bountyId],
  });

  await database
    .update(bounties, {
      id: Number(bountyId),
      chainId: context.network.chainId,
    })
    .set((raw) => ({
      amount: (BigInt(raw.amount) + amount).toString(),
      amountSort: Number(formatEther(BigInt(raw.amount) + amount)),
      isJoinedBounty: true,
      deadline: Number(deadline),
    }));

  await database.insert(participationsBounties).values({
    userAddress: participant,
    bountyId: Number(bountyId),
    amount: amount.toString(),
    chainId: context.network.chainId,
  });
});

ponder.on(
  "PoidhContract:WithdrawFromOpenBounty",
  async ({ event, context }) => {
    const database = context.db;
    const { amount, participant, bountyId } = event.args;

    await database
      .update(bounties, {
        id: Number(bountyId),
        chainId: context.network.chainId,
      })
      .set((raw) => ({
        amount: (BigInt(raw.amount) - amount).toString(),
        amountSort: Number(formatEther(BigInt(raw.amount) - amount)),
      }));

    await database.delete(participationsBounties, {
      bountyId: Number(bountyId),
      userAddress: participant,
      chainId: context.network.chainId,
    });
  }
);

ponder.on("PoidhContract:ClaimCreated", async ({ event, context }) => {
  const database = context.db;
  const { bountyId, description, id, issuer, name } = event.args;

  await database
    .insert(users)
    .values({ address: issuer })
    .onConflictDoNothing();

  await database
    .insert(claims)
    .values({
      id: Number(id),
      chainId: context.network.chainId,
      title: name,
      description,
      url: "",
      issuer,
      bountyId: Number(bountyId),
      owner: context.contracts.PoidhContract.address!,
    })
    .onConflictDoUpdate({
      title: name,
      description,
      issuer,
      bountyId: Number(bountyId),
    });
});

ponder.on("PoidhContract:ClaimAccepted", async ({ event, context }) => {
  const database = context.db;
  const { claimId, bountyId } = event.args;

  await database
    .update(claims, {
      id: Number(claimId),
      chainId: context.network.chainId,
    })
    .set({
      isAccepted: true,
    });

  await database
    .update(bounties, {
      id: Number(bountyId),
      chainId: context.network.chainId,
    })
    .set({
      inProgress: false,
    });
});

ponder.on("PoidhContract:ResetVotingPeriod", async ({ event, context }) => {
  const database = context.db;
  const { bountyId } = event.args;
  const { client, contracts } = context;
  const [_, __, deadline] = await client.readContract({
    abi: contracts.PoidhContract.abi,
    address: contracts.PoidhContract.address,
    functionName: "bountyVotingTracker",
    args: [bountyId],
  });

  await database
    .update(bounties, {
      id: Number(bountyId),
      chainId: context.network.chainId,
    })
    .set({
      deadline: Number(deadline),
      isVoting: false,
      inProgress: false,
    });
});

ponder.on("PoidhContract:ClaimSubmittedForVote", async ({ event, context }) => {
  const database = context.db;
  const { bountyId } = event.args;
  const { client, contracts } = context;

  const [_, __, deadline] = await client.readContract({
    abi: contracts.PoidhContract.abi,
    address: contracts.PoidhContract.address,
    functionName: "bountyVotingTracker",
    args: [bountyId],
    blockNumber: event.block.number,
  });

  await database
    .update(bounties, {
      id: Number(bountyId),
      chainId: context.network.chainId,
    })
    .set({
      isVoting: true,
      deadline: Number(deadline),
    });
});

ponder.on("PoidhContract:VoteClaim", async ({ event, context }) => {
  const database = context.db;
  const { bountyId } = event.args;
  const { client, contracts } = context;

  const [_, __, deadline] = await client.readContract({
    abi: contracts.PoidhContract.abi,
    address: contracts.PoidhContract.address,
    functionName: "bountyVotingTracker",
    args: [bountyId],
    blockNumber: event.block.number,
  });

  await database
    .update(bounties, {
      id: Number(bountyId),
      chainId: context.network.chainId,
    })
    .set({
      deadline: Number(deadline),
    });
});
