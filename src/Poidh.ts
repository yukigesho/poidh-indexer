import { ponder } from "ponder:registry";
import {
  bounties,
  claims,
  participationsBounties,
  users,
  transactions,
  leaderboard,
} from "../ponder.schema";
import { formatEther } from "viem";
import { desc, sql } from "ponder";
import offchainDatabase from "../offchain.database";
import { priceTable } from "../offchain.schema";
import {
  getFarcasterFids,
  getDisplayName,
  sendNotification,
} from "./helpers/notifications";
import { getCurrencyByChainId } from "./helpers/price";

const POIDH_BASE_URL = "https://poidh.xyz";

function isLive(block: bigint) {
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const maxDrift = 60n;

  return nowSec - block <= maxDrift;
}

const [price] = await offchainDatabase
  .select()
  .from(priceTable)
  .orderBy(desc(priceTable.id))
  .limit(1);

ponder.on("PoidhContract:BountyCreated", async ({ event, context }) => {
  const database = context.db;
  const { id, name, amount, issuer, description } = event.args;
  const { hash, transactionIndex } = event.transaction;
  const { timestamp } = event.block;

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

  const amountSort =
    Number(formatEther(amount)) *
    (context.chain.id === 666666666
      ? Number(price!.degen_usd)
      : Number(price!.eth_usd));

  await database.insert(bounties).values({
    id: Number(id),
    chainId: context.chain.id,
    title: name,
    createdAt: timestamp,
    description: description,
    amount: amount.toString(),
    amountSort,
    issuer,
    isMultiplayer,
  });

  await database.insert(participationsBounties).values({
    userAddress: issuer,
    bountyId: Number(id),
    amount: amount.toString(),
    chainId: context.chain.id,
  });

  await database.insert(transactions).values({
    index: transactionIndex,
    tx: hash,
    address: issuer,
    bountyId: Number(id),
    action: `bounty created`,
    chainId: context.chain.id,
    timestamp,
  });

  if (amountSort >= 100 && isLive(event.block.timestamp)) {
    const creatorName = await getDisplayName(issuer);
    await sendNotification({
      title: `💰 NEW $${amountSort.toFixed(0)} BOUNTY 💰`,
      messageBody: `${name}${creatorName ? ` from ${creatorName}` : ""}`,
      targetUrl: `${POIDH_BASE_URL}/${context.chain.name}/bounty/${id}`,
    });
  }
});

ponder.on("PoidhContract:BountyCancelled", async ({ event, context }) => {
  const database = context.db;
  const { bountyId, issuer } = event.args;
  const { hash, transactionIndex } = event.transaction;
  const { timestamp } = event.block;

  await database
    .update(bounties, {
      id: Number(bountyId),
      chainId: context.chain.id,
    })
    .set({
      isCanceled: true,
      inProgress: false,
    });

  await database.insert(transactions).values({
    index: transactionIndex,
    tx: hash,
    address: issuer,
    bountyId: Number(bountyId),
    action: `bounty canceled`,
    chainId: context.chain.id,
    timestamp,
  });
});

ponder.on("PoidhContract:BountyJoined", async ({ event, context }) => {
  const database = context.db;
  const { amount, participant, bountyId } = event.args;
  const { client, contracts } = context;
  const { hash, transactionIndex } = event.transaction;
  const { timestamp } = event.block;

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

  const updatedBounty = await database
    .update(bounties, {
      id: Number(bountyId),
      chainId: context.chain.id,
    })
    .set((raw) => ({
      amount: (BigInt(raw.amount) + amount).toString(),
      isJoinedBounty: true,
      amountSort:
        Number(formatEther(BigInt(raw.amount) + amount)) *
        (context.chain.id === 666666666
          ? Number(price!.degen_usd)
          : Number(price!.eth_usd)),
      deadline: Number(deadline),
    }));

  await database.insert(participationsBounties).values({
    userAddress: participant,
    bountyId: Number(bountyId),
    amount: amount.toString(),
    chainId: context.chain.id,
  });

  await database.insert(transactions).values({
    index: transactionIndex,
    tx: hash,
    address: participant,
    bountyId: Number(bountyId),
    action: `+${formatEther(amount)} ${
      context.chain.name === "degen" ? "degen" : "eth"
    }`,
    chainId: context.chain.id,
    timestamp,
  });

  if (isLive(event.block.timestamp)) {
    const joinedAmountUsd =
      Number(formatEther(BigInt(amount))) *
      (context.chain.id === 666666666
        ? Number(price!.degen_usd)
        : Number(price!.eth_usd));
    if (
      updatedBounty.amountSort >= 100 &&
      updatedBounty.amountSort - joinedAmountUsd < 100
    ) {
      const creatorName = await getDisplayName(updatedBounty.issuer);
      await sendNotification({
        title: `💰 NEW $${updatedBounty.amountSort.toFixed(0)} BOUNTY 💰`,
        messageBody: `${updatedBounty.title}${
          creatorName ? ` from ${creatorName}` : ""
        }`,
        targetUrl: `${POIDH_BASE_URL}/${context.chain.name}/bounty/${updatedBounty.id}`,
      });
    }

    const bountyParticipants =
      await database.sql.query.participationsBounties.findMany({
        where: (table, { and, eq, ne }) =>
          and(
            eq(table.bountyId, Number(bountyId)),
            eq(table.chainId, context.chain.id),
            ne(table.userAddress, participant)
          ),
      });
    const bountyParticipantsTargetFids = await getFarcasterFids(
      bountyParticipants.map((p) => p.userAddress)
    );
    if (bountyParticipantsTargetFids.length > 0) {
      const contributorDisplayName = await getDisplayName(participant);
      const currency = getCurrencyByChainId({ chainId: context.chain.id });
      await sendNotification({
        title: "new contribution on poidh 💰",
        messageBody: `${
          updatedBounty.title
        } has received a contribution of ${formatEther(
          BigInt(amount)
        )} ${currency.toUpperCase()} from ${contributorDisplayName}`,
        targetUrl: `${POIDH_BASE_URL}/${context.chain.name}/bounty/${updatedBounty.id}`,
        targetFIds: bountyParticipantsTargetFids,
      });
    }
  }
});

ponder.on(
  "PoidhContract:WithdrawFromOpenBounty",
  async ({ event, context }) => {
    const database = context.db;
    const { amount, participant, bountyId } = event.args;
    const { hash, transactionIndex } = event.transaction;
    const { timestamp } = event.block;

    await database
      .update(bounties, {
        id: Number(bountyId),
        chainId: context.chain.id,
      })
      .set((raw) => ({
        amount: (BigInt(raw.amount) - amount).toString(),
        amountSort:
          Number(formatEther(BigInt(raw.amount) - amount)) *
          (context.chain.id === 666666666
            ? Number(price!.degen_usd)
            : Number(price!.eth_usd)),
      }));

    await database.delete(participationsBounties, {
      bountyId: Number(bountyId),
      userAddress: participant,
      chainId: context.chain.id,
    });

    await database.insert(transactions).values({
      index: transactionIndex,
      tx: hash,
      address: participant,
      bountyId: Number(bountyId),
      action: `-${formatEther(amount)} ${
        context.chain.name === "degen" ? "degen" : "eth"
      }`,
      chainId: context.chain.id,
      timestamp,
    });
  }
);

ponder.on("PoidhContract:ClaimCreated", async ({ event, context }) => {
  const database = context.db;
  const { bountyId, description, id, issuer, name } = event.args;
  const { hash, transactionIndex } = event.transaction;
  const { timestamp } = event.block;

  await database
    .insert(users)
    .values({ address: issuer })
    .onConflictDoNothing();

  await database
    .insert(claims)
    .values({
      id: Number(id),
      chainId: context.chain.id,
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

  await database.insert(transactions).values({
    index: transactionIndex,
    tx: hash,
    address: issuer,
    bountyId: Number(bountyId),
    claimId: Number(id),
    action: "claim created",
    chainId: context.chain.id,
    timestamp,
  });

  if (isLive(event.block.timestamp)) {
    const contributors =
      await database.sql.query.participationsBounties.findMany({
        where: (table, { and, eq }) =>
          and(
            eq(table.bountyId, Number(bountyId)),
            eq(table.chainId, context.chain.id)
          ),
      });

    const targetFIds = await getFarcasterFids(
      contributors.map((c) => c.userAddress)
    );
    if (targetFIds.length > 0) {
      const claimCreatorName = await getDisplayName(issuer);
      const bounty = await database.sql.query.bounties.findFirst({
        where: (table, { and, eq }) =>
          and(
            eq(table.id, Number(bountyId)),
            eq(table.chainId, context.chain.id)
          ),
      });

      await sendNotification({
        title: "new claim on poidh 🖼️",
        messageBody: `${bounty?.title} has received a new claim from ${claimCreatorName}`,
        targetUrl: `${POIDH_BASE_URL}/${context.chain.name}/bounty/${bountyId}`,
        targetFIds,
      });
    }
  }
});

ponder.on("PoidhContract:ClaimAccepted", async ({ event, context }) => {
  const database = context.db;
  const { claimId, claimIssuer } = event.args;
  const { hash, transactionIndex } = event.transaction;
  const { timestamp } = event.block;

  const bountyId = Number(event.args.bountyId);
  const chainId = context.chain.id;

  await database
    .update(claims, {
      id: Number(claimId),
      chainId: context.chain.id,
    })
    .set({
      isAccepted: true,
    });

  const bounty = await database
    .update(bounties, {
      id: bountyId,
      chainId,
    })
    .set({
      inProgress: false,
    });

  await database.insert(transactions).values({
    index: transactionIndex,
    tx: hash,
    address: claimIssuer,
    bountyId,
    action: "claim accepted",
    chainId,
    timestamp,
  });

  const participations =
    await database.sql.query.participationsBounties.findMany({
      where: (table, { and, eq }) =>
        and(eq(table.bountyId, bountyId), eq(table.chainId, chainId)),
    });
  await database.sql
    .insert(leaderboard)
    .values({
      address: claimIssuer,
      chainId,
      earned: Number(formatEther(BigInt(bounty.amount))),
    })
    .onConflictDoUpdate({
      target: [leaderboard.address, leaderboard.chainId],
      set: {
        earned: sql`${leaderboard.earned} + ${Number(
          formatEther(BigInt(bounty.amount))
        )}`,
      },
    });

  await Promise.all(
    participations.map(async (p) => {
      const paid = Number(formatEther(BigInt(p.amount)));
      return database.sql
        .insert(leaderboard)
        .values({
          address: p.userAddress,
          chainId,
          paid: Number(formatEther(BigInt(p.amount))),
        })
        .onConflictDoUpdate({
          target: [leaderboard.address, leaderboard.chainId],
          set: {
            paid: sql`${leaderboard.paid} + ${paid}`,
          },
        });
    })
  );

  if (isLive(event.block.timestamp)) {
    const targetFIds = await getFarcasterFids([claimIssuer.toLowerCase()]);
    if (targetFIds.length > 0) {
      const creatorName = await getDisplayName(bounty.issuer);
      await sendNotification({
        title: "you won a bounty! 🏆",
        messageBody: `you're the winner of ${bounty.title} from ${creatorName} - bounty funds have been transferred to your wallet`,
        targetUrl: `${POIDH_BASE_URL}/${context.chain.name}/bounty/${bounty.id}`,
        targetFIds: targetFIds,
      });
    }
  }
});

ponder.on("PoidhContract:ResetVotingPeriod", async ({ event, context }) => {
  const database = context.db;
  const { bountyId } = event.args;
  const { client, contracts } = context;
  const { hash, transactionIndex } = event.transaction;
  const { timestamp } = event.block;

  const [_, __, deadline] = await client.readContract({
    abi: contracts.PoidhContract.abi,
    address: contracts.PoidhContract.address,
    functionName: "bountyVotingTracker",
    args: [bountyId],
  });

  await database
    .update(bounties, {
      id: Number(bountyId),
      chainId: context.chain.id,
    })
    .set({
      deadline: Number(deadline),
      isVoting: false,
      inProgress: false,
    });

  await database.insert(transactions).values({
    index: transactionIndex,
    tx: hash,
    address: "0x0",
    bountyId: Number(bountyId),
    action: "voting reset period",
    chainId: context.chain.id,
    timestamp,
  });
});

ponder.on("PoidhContract:ClaimSubmittedForVote", async ({ event, context }) => {
  const database = context.db;
  const { bountyId, claimId } = event.args;
  const { client, contracts } = context;
  const { hash, transactionIndex } = event.transaction;
  const { timestamp } = event.block;

  const [_, __, deadline] = await client.readContract({
    abi: contracts.PoidhContract.abi,
    address: contracts.PoidhContract.address,
    functionName: "bountyVotingTracker",
    args: [bountyId],
    blockNumber: event.block.number,
  });

  const updatedBounty = await database
    .update(bounties, {
      id: Number(bountyId),
      chainId: context.chain.id,
    })
    .set({
      isVoting: true,
      deadline: Number(deadline),
    });

  await database.insert(transactions).values({
    index: transactionIndex,
    tx: hash,
    address: "0x0",
    bountyId: Number(bountyId),
    action: `${claimId} submitted for vote`,
    chainId: context.chain.id,
    timestamp,
  });

  if (isLive(timestamp)) {
    const submittedClaim = await database.sql.query.claims.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.id, Number(claimId)), eq(table.chainId, context.chain.id)),
    });
    if (!submittedClaim) return;

    const nominatedUserTargetFids = await getFarcasterFids([
      submittedClaim.issuer,
    ]);
    if (nominatedUserTargetFids.length > 0) {
      await sendNotification({
        title: `your claim is nominated 🗳️`,
        messageBody: `your claim is up for vote for ${updatedBounty.title} - contributors will now vote to confirm`,
        targetUrl: `${POIDH_BASE_URL}/${context.chain.name}/bounty/${updatedBounty.id}`,
        targetFIds: nominatedUserTargetFids,
      });
    }

    const bountyIssuerDisplayName = await getDisplayName(updatedBounty.issuer);

    const bountyParticipants =
      await database.sql.query.participationsBounties.findMany({
        where: (table, { and, eq, ne }) =>
          and(
            eq(table.bountyId, Number(bountyId)),
            eq(table.chainId, context.chain.id),
            ne(table.userAddress, updatedBounty.issuer)
          ),
      });
    const bountyParticipantsTargetFids = await getFarcasterFids(
      bountyParticipants.map((p) => p.userAddress)
    );
    if (bountyParticipantsTargetFids.length > 0) {
      await sendNotification({
        title: `your vote is needed 🗳️`,
        messageBody: `${bountyIssuerDisplayName} has proposed a winner for ${updatedBounty.title} - you have 48 hours to vote`,
        targetUrl: `${POIDH_BASE_URL}/${context.chain.name}/bounty/${updatedBounty.id}`,
        targetFIds: bountyParticipantsTargetFids,
      });
    }

    const allBountyClaims = await database.sql
      .selectDistinctOn([claims.issuer])
      .from(claims)
      .where(
        sql`${claims.bountyId} = ${bountyId} and ${claims.chainId} = ${context.chain.id} and not lower(${claims.issuer}) = lower(${submittedClaim.issuer})`
      );
    const claimIssuerFIds = await getFarcasterFids(
      allBountyClaims.map((c) => c.issuer)
    );
    if (claimIssuerFIds.length > 0) {
      await sendNotification({
        title: `your claim was not nominated`,
        messageBody: `${bountyIssuerDisplayName} has proposed a winner for ${updatedBounty.title} - your claim was not selected`,
        targetUrl: `${POIDH_BASE_URL}/${context.chain.name}/bounty/${updatedBounty.id}`,
        targetFIds: claimIssuerFIds,
      });
    }
  }
});

ponder.on("PoidhContract:VoteClaim", async ({ event, context }) => {
  const database = context.db;
  const { bountyId, claimId, voter } = event.args;
  const { client, contracts } = context;
  const { hash, transactionIndex } = event.transaction;
  const { timestamp } = event.block;

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
      chainId: context.chain.id,
    })
    .set({
      deadline: Number(deadline),
    });

  await database.insert(transactions).values({
    index: transactionIndex,
    tx: hash,
    address: voter,
    bountyId: Number(bountyId),
    action: `voted`,
    chainId: context.chain.id,
    timestamp,
  });
});
