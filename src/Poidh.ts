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
import { sql } from "ponder";

ponder.on(
  "PoidhContract:BountyCreated",
  async ({ event, context }) => {
    const database = context.db;
    const {
      id,
      name,
      amount,
      issuer,
      description,
    } = event.args;
    const { hash, transactionIndex } =
      event.transaction;
    const { timestamp } = event.block;

    await database
      .insert(users)
      .values({ address: issuer })
      .onConflictDoNothing();

    const isMultiplayer =
      (
        await context.client.readContract({
          abi: context.contracts.PoidhContract
            .abi,
          address:
            context.contracts.PoidhContract
              .address,
          functionName: "getParticipants",
          args: [id],
        })
      )[0].length > 0;

    await database.insert(bounties).values({
      id: Number(id),
      chainId: context.chain.id,
      title: name,
      description: description,
      amount: amount.toString(),
      amountSort: Number(formatEther(amount)),
      issuer,
      isMultiplayer,
    });

    await database
      .insert(participationsBounties)
      .values({
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
  },
);

ponder.on(
  "PoidhContract:BountyCancelled",
  async ({ event, context }) => {
    const database = context.db;
    const { bountyId, issuer } = event.args;
    const { hash, transactionIndex } =
      event.transaction;
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
  },
);

ponder.on(
  "PoidhContract:BountyJoined",
  async ({ event, context }) => {
    const database = context.db;
    const { amount, participant, bountyId } =
      event.args;
    const { client, contracts } = context;
    const { hash, transactionIndex } =
      event.transaction;
    const { timestamp } = event.block;

    await database
      .insert(users)
      .values({ address: participant })
      .onConflictDoNothing();

    const [_, __, deadline] =
      await client.readContract({
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
      .set((raw) => ({
        amount: (
          BigInt(raw.amount) + amount
        ).toString(),
        isJoinedBounty: true,
        amountSort: Number(
          formatEther(
            BigInt(raw.amount) + amount,
          ),
        ),
        deadline: Number(deadline),
      }));

    await database
      .insert(participationsBounties)
      .values({
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
      action: `+${formatEther(amount)} ${context.chain.name === "degen" ? "degen" : "eth"}`,
      chainId: context.chain.id,
      timestamp,
    });
  },
);

ponder.on(
  "PoidhContract:WithdrawFromOpenBounty",
  async ({ event, context }) => {
    const database = context.db;
    const { amount, participant, bountyId } =
      event.args;
    const { hash, transactionIndex } =
      event.transaction;
    const { timestamp } = event.block;

    await database
      .update(bounties, {
        id: Number(bountyId),
        chainId: context.chain.id,
      })
      .set((raw) => ({
        amount: (
          BigInt(raw.amount) - amount
        ).toString(),
        amountSort: Number(
          formatEther(
            BigInt(raw.amount) - amount,
          ),
        ),
      }));

    await database.delete(
      participationsBounties,
      {
        bountyId: Number(bountyId),
        userAddress: participant,
        chainId: context.chain.id,
      },
    );

    await database.insert(transactions).values({
      index: transactionIndex,
      tx: hash,
      address: participant,
      bountyId: Number(bountyId),
      action: `-${formatEther(amount)} ${context.chain.name === "degen" ? "degen" : "eth"}`,
      chainId: context.chain.id,
      timestamp,
    });
  },
);

ponder.on(
  "PoidhContract:ClaimCreated",
  async ({ event, context }) => {
    const database = context.db;
    const {
      bountyId,
      description,
      id,
      issuer,
      name,
    } = event.args;
    const { hash, transactionIndex } =
      event.transaction;
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
        owner:
          context.contracts.PoidhContract
            .address!,
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
      action: "claim created",
      chainId: context.chain.id,
      timestamp,
    });
  },
);

ponder.on(
  "PoidhContract:ClaimAccepted",
  async ({ event, context }) => {
    const database = context.db;
    const { claimId, claimIssuer } = event.args;
    const { hash, transactionIndex } =
      event.transaction;
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
      await database.sql.query.participationsBounties.findMany(
        {
          where: (table, { and, eq }) =>
            and(
              eq(table.bountyId, bountyId),
              eq(table.chainId, chainId),
            ),
        },
      );
    await database.sql
      .insert(leaderboard)
      .values({
        address: claimIssuer,
        chainId,
        earned: bounty.amountSort,
      })
      .onConflictDoUpdate({
        target: [
          leaderboard.address,
          leaderboard.chainId,
        ],
        set: {
          earned: sql`${leaderboard.earned} + ${bounty.amountSort}`,
        },
      });
    await Promise.all(
      participations.map(async (p) => {
        const paid = Number(
          formatEther(BigInt(p.amount)),
        );
        return database.sql
          .insert(leaderboard)
          .values({
            address: p.userAddress,
            chainId,
            paid: Number(
              formatEther(BigInt(p.amount)),
            ),
          })
          .onConflictDoUpdate({
            target: [
              leaderboard.address,
              leaderboard.chainId,
            ],
            set: {
              paid: sql`${leaderboard.paid} + ${paid}`,
            },
          });
      }),
    );
  },
);

ponder.on(
  "PoidhContract:ResetVotingPeriod",
  async ({ event, context }) => {
    const database = context.db;
    const { bountyId } = event.args;
    const { client, contracts } = context;
    const { hash, transactionIndex } =
      event.transaction;
    const { timestamp } = event.block;

    const [_, __, deadline] =
      await client.readContract({
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
  },
);

ponder.on(
  "PoidhContract:ClaimSubmittedForVote",
  async ({ event, context }) => {
    const database = context.db;
    const { bountyId, claimId } = event.args;
    const { client, contracts } = context;
    const { hash, transactionIndex } =
      event.transaction;
    const { timestamp } = event.block;

    const [_, __, deadline] =
      await client.readContract({
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
  },
);

ponder.on(
  "PoidhContract:VoteClaim",
  async ({ event, context }) => {
    const database = context.db;
    const { bountyId, claimId, voter } =
      event.args;
    const { client, contracts } = context;
    const { hash, transactionIndex } =
      event.transaction;
    const { timestamp } = event.block;

    const [_, __, deadline] =
      await client.readContract({
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
  },
);
