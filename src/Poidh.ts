import { ponder } from "@/generated";
import { calcId } from "../utils";

ponder.on("PoidhContract:BountyCreated", async ({ event, context }) => {
  const { Bounty, User, ParticipantBounty } = context.db;
  const { id, name, amount, issuer, createdAt, description } = event.args;

  const user = await User.upsert({ id: issuer, create: {}, update: {} });

  await Bounty.create({
    id: calcId({ id, chainId: context.network.chainId }),
    data: {
      primaryId: id,
      chainId: BigInt(context.network.chainId),
      title: name,
      description,
      amount: amount.toString(),
      createdAt,
      inProgress: true,
      isBanned: false,
      issuer: user.id,
    },
  });

  await ParticipantBounty.create({
    id: event.block.number * 100_000n + BigInt(event.log.logIndex),
    data: {
      amount: amount.toString(),
      bountyId: calcId({
        id,
        chainId: BigInt(context.network.chainId),
      }),
      userId: user.id,
    },
  });
});

ponder.on("PoidhContract:BountyCancelled", async ({ event, context }) => {
  const { Bounty } = context.db;
  const { bountyId } = event.args;

  await Bounty.update({
    id: calcId({
      id: bountyId,
      chainId: context.network.chainId,
    }),
    data: {
      inProgress: false,
      isCanceled: true,
    },
  });
});

ponder.on("PoidhContract:BountyJoined", async ({ event, context }) => {
  const { Bounty, User, ParticipantBounty } = context.db;
  const { amount, participant, bountyId } = event.args;
  const { client, contracts } = context;
  const user = await User.upsert({ id: participant, create: {}, update: {} });

  const [yesAmount, noAmount, deadline] = await client.readContract({
    abi: contracts.PoidhContract.abi,
    address: contracts.PoidhContract.address,
    functionName: "bountyVotingTracker",
    args: [bountyId],
  });

  await Bounty.update({
    id: calcId({ id: bountyId, chainId: context.network.chainId }),
    data: ({ current }) => ({
      amount: (BigInt(current.amount) + amount).toString(),
      isMultiplayer: true,
      yes: yesAmount,
      no: noAmount,
      deadline: deadline,
    }),
  });

  await ParticipantBounty.create({
    id: event.block.number * 100_000n + BigInt(event.log.logIndex),
    data: {
      amount: amount.toString(),
      bountyId: calcId({
        id: bountyId,
        chainId: BigInt(context.network.chainId),
      }),
      userId: user.id,
    },
  });
});

ponder.on(
  "PoidhContract:WithdrawFromOpenBounty",
  async ({ event, context }) => {
    const { Bounty, ParticipantBounty, User } = context.db;
    const { amount, participant, bountyId } = event.args;

    await Bounty.update({
      id: calcId({ id: bountyId, chainId: context.network.chainId }),
      data: ({ current }) => ({
        amount: (BigInt(current.amount) - amount).toString(),
      }),
    });

    const user = await User.upsert({ id: participant, create: {}, update: {} });

    const { items: bounties } = await ParticipantBounty.findMany({
      where: { userId: user.id, bountyId: bountyId },
    });

    await Promise.all(
      bounties.map(async (bounty) => {
        await ParticipantBounty.delete({ id: bounty.id });
      })
    );
  }
);

ponder.on("PoidhContract:ClaimCreated", async ({ event, context }) => {
  const { Claim, User } = context.db;
  const { bountyId, createdAt, description, id, issuer, name } = event.args;
  const user = await User.upsert({ id: issuer, create: {}, update: {} });

  await Claim.upsert({
    id: calcId({ id, chainId: context.network.chainId }),
    update: {
      primaryId: id,
      chainId: BigInt(context.network.chainId),
      title: name,
      description: description,
      bountyId: calcId({
        id: bountyId,
        chainId: BigInt(context.network.chainId),
      }),
      createdAt: createdAt,
      isBanned: false,
      issuerId: user.id,
      ownerId: context.contracts.PoidhContract.address,
      accepted: false,
    },
    create: {
      primaryId: id,
      chainId: BigInt(context.network.chainId),
      title: name,
      url: "",
      description: description,
      bountyId: calcId({
        id: bountyId,
        chainId: BigInt(context.network.chainId),
      }),
      createdAt: createdAt,
      isBanned: false,
      issuerId: user.id,
      ownerId: context.contracts.PoidhContract.address!,
      accepted: false,
    },
  });
});

ponder.on("PoidhContract:ClaimAccepted", async ({ event, context }) => {
  const { Bounty, Claim } = context.db;
  const { claimId, bountyId } = event.args;

  await Bounty.update({
    id: calcId({ id: bountyId, chainId: context.network.chainId }),
    data: {
      inProgress: false,
    },
  });

  await Claim.update({
    id: calcId({ id: claimId, chainId: context.network.chainId }),
    data: {
      accepted: true,
    },
  });
});

ponder.on("PoidhContract:ResetVotingPeriod", async ({ event, context }) => {
  const { Bounty } = context.db;
  const { bountyId } = event.args;
  const { client, contracts } = context;
  const [yesAmount, noAmount, deadline] = await client.readContract({
    abi: contracts.PoidhContract.abi,
    address: contracts.PoidhContract.address,
    functionName: "bountyVotingTracker",
    args: [bountyId],
  });
  await Bounty.update({
    id: calcId({ id: bountyId, chainId: context.network.chainId }),
    data: {
      yes: yesAmount,
      no: noAmount,
      deadline: deadline,
    },
  });
});

ponder.on("PoidhContract:ClaimSubmittedForVote", async ({ event, context }) => {
  const { Bounty } = context.db;
  const { bountyId, claimId } = event.args;
  const { client, contracts } = context;

  const [yesAmount, noAmount, deadline] = await client.readContract({
    abi: contracts.PoidhContract.abi,
    address: contracts.PoidhContract.address,
    functionName: "bountyVotingTracker",
    args: [bountyId],
    blockNumber: event.block.number,
  });

  await Bounty.update({
    id: calcId({ id: bountyId, chainId: context.network.chainId }),
    data: {
      yes: yesAmount,
      no: noAmount,
      deadline: deadline,
    },
  });
});

ponder.on("PoidhContract:VoteClaim", async ({ event, context }) => {
  const { Vote, Bounty } = context.db;
  const { bountyId, claimId, voter } = event.args;
  const { client, contracts } = context;

  const [yesAmount, noAmount, deadline] = await client.readContract({
    abi: contracts.PoidhContract.abi,
    address: contracts.PoidhContract.address,
    functionName: "bountyVotingTracker",
    args: [bountyId],
    blockNumber: event.block.number,
  });

  const bounty = await Bounty.findUnique({
    id: calcId({ id: bountyId, chainId: context.network.chainId }),
  });

  await Vote.create({
    id: voter + event.block.number + event.log.logIndex,
    data: {
      vote: bounty?.yes === yesAmount ? "no" : "yes",
      claimId: calcId({
        id: claimId,
        chainId: BigInt(context.network.chainId),
      }),
      bountyId: calcId({
        id: bountyId,
        chainId: BigInt(context.network.chainId),
      }),
      userId: voter,
    },
  });
  await Bounty.update({
    id: calcId({ id: bountyId, chainId: context.network.chainId }),
    data: {
      yes: yesAmount,
      no: noAmount,
      deadline: deadline,
    },
  });
});
