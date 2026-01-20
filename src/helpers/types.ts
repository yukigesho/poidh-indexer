export type Address = `0x${string}`;

export type BountyBaseData = {
  id: number;
  chainId: number;
  onChainId: number;
  title: string;
  description: string;
  amount: number;
  issuer: Address;
  createdAt: number;
  inProgress: boolean;
  isJoinedBounty: boolean;
  isCanceled: boolean;
  isMultiplayer: boolean;
  isVoting: boolean;
  deadline?: number | null;
  currency: string;
};

export type BountyWithParticipantsData = BountyBaseData & {
  participants: Address[];
};

export type ClaimEventData = {
  id: number;
  chainId: number;
  onChainId: number;
  bountyId: number;
  title: string;
  description: string;
  url: string;
  issuer: Address;
  owner: Address;
  isVoting: boolean;
  isAccepted: boolean;
};

export type BountyCreatedEventData = BountyBaseData;

export type BountyJoinedEventData = {
  participant: {
    address: Address;
    amount: number;
  };
  bounty: BountyWithParticipantsData;
};

export type ClaimCreatedEventData = {
  bounty: BountyWithParticipantsData;
  claim: ClaimEventData;
};

export type ClaimAcceptedEventData = {
  bounty: BountyWithParticipantsData;
  claim: ClaimEventData;
};

export type VotingStartedEventData = {
  bounty: BountyWithParticipantsData;
  claim: ClaimEventData;
  otherClaimers: Address[];
};

export type NotificationEventPayload =
  | {
      event: "BountyCreated";
      data: BountyCreatedEventData;
    }
  | {
      event: "BountyJoined";
      data: BountyJoinedEventData;
    }
  | {
      event: "ClaimCreated";
      data: ClaimCreatedEventData;
    }
  | {
      event: "ClaimAccepted";
      data: ClaimAcceptedEventData;
    }
  | {
      event: "VotingStarted";
      data: VotingStartedEventData;
    };
