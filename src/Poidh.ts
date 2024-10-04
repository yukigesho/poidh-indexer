import { ponder } from "@/generated";
import PoidhV2NFTABI from "../abis/PoidhV2NFTAbi";
const POIDH_NFT_CONTRACT_ADDRESS = "0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80";

ponder.on("PoidhContract:BountyCreated", async ({ event, context }) => {
  const { Bounty, User } = context.db;
  const { id, name, amount, issuer, createdAt, description } = event.args;

  const user = await User.upsert({ id: issuer, create: {}, update: {} });

  await Bounty.create({
    id: id + BigInt(context.network.chainId),
    data: {
      title: name,
      description,
      amount: amount,
      createdAt,
      inProgress: true,
      isBanned: false,
      issuerId: user.id,
      chainId: context.network.chainId,
    },
  });
});

ponder.on("PoidhContract:BountyCancelled", async ({ event, context }) => {
  const { Bounty } = context.db;
  const { bountyId } = event.args;

  await Bounty.update({
    id: bountyId + BigInt(context.network.chainId),
    data: {
      inProgress: false,
    },
  });
});

ponder.on("PoidhContract:BountyJoined", async ({ event, context }) => {
  const { Bounty, User, ParticipantBounty } = context.db;
  const { amount, participant } = event.args;

  const user = await User.upsert({ id: participant, create: {}, update: {} });

  const bountyId = event.args.bountyId + BigInt(context.network.chainId);

  await Bounty.update({
    id: bountyId,
    data: ({ current }) => ({
      amount: current.amount + amount,
      isMultiplayer: true,
      yes: 0n,
      no: 0n,
      deadline: event.block.timestamp,
    }),
  });

  await ParticipantBounty.create({
    id: event.block.number * 100_000n + BigInt(event.log.logIndex),
    data: {
      bountyId: bountyId,
      userId: user.id,
    },
  });
});

ponder.on(
  "PoidhContract:WithdrawFromOpenBounty",
  async ({ event, context }) => {
    const { Bounty, ParticipantBounty, User } = context.db;
    const { amount, participant } = event.args;

    const bountyId = event.args.bountyId + BigInt(context.network.chainId);

    await Bounty.update({
      id: bountyId,
      data: ({ current }) => ({
        amount: current.amount - amount,
      }),
    });

    const user = await User.upsert({ id: participant, create: {}, update: {} });

    const { items: bounties } = await ParticipantBounty.findMany({
      where: { userId: user.id, bountyId: bountyId },
    });

    bounties.forEach(async (bounty) => {
      await ParticipantBounty.delete({ id: bounty.id });
    });
  }
);

ponder.on("PoidhContract:ClaimCreated", async ({ event, context }) => {
  const { Claim, User } = context.db;
  const { bountyId, createdAt, description, id, issuer, name } = event.args;
  const user = await User.upsert({ id: issuer, create: {}, update: {} });

  const url = await context.client.readContract({
    abi: PoidhV2NFTABI,
    address: POIDH_NFT_CONTRACT_ADDRESS,
    functionName: "tokenURI",
    args: [id],
  });

  await Claim.create({
    id: id + BigInt(context.network.chainId),
    data: {
      title: name,
      url: url,
      description: description,
      bountyId: bountyId + BigInt(context.network.chainId),
      createdAt: createdAt,
      isBanned: false,
      issuerId: user.id,
      ownerId: context.contracts.PoidhContract.address,
    },
  });
});

ponder.on("PoidhContract:ClaimAccepted", async ({ event, context }) => {
  const { Bounty } = context.db;
  const { claimId, bountyId } = event.args;

  await Bounty.update({
    id: bountyId + BigInt(context.network.chainId),
    data: {
      winnerClaimId: claimId + BigInt(context.network.chainId),
      inProgress: false,
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
    blockNumber: event.block.number + 1n,
  });

  await Bounty.update({
    id: bountyId + BigInt(context.network.chainId),
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
    blockNumber: event.block.number + 1n,
  });

  const bounty = await Bounty.findUnique({
    id: bountyId + BigInt(context.network.chainId),
  });

  await Vote.create({
    id: voter + event.block.number.toString(),
    data: {
      vote: bounty?.yes === yesAmount ? "no" : "yes",
      claimId: claimId + BigInt(context.network.chainId),
      bountyId: bountyId + BigInt(context.network.chainId),
      userId: voter,
    },
  });

  await Bounty.update({
    id: bountyId + BigInt(context.network.chainId),
    data: {
      yes: yesAmount,
      no: noAmount,
      deadline: deadline,
    },
  });
});
