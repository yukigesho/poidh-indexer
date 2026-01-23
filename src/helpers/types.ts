export type Address = `0x${string}`;

export type BountyBaseData = {
  id: number;
  chainId: number;
  onChainId: number;
  amountUSD: number;
  amountCrypto: string;
  title: string;
  description: string;
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

export type BountyWithParticipantsData =
  BountyBaseData & {
    participants: Address[];
  };

export type WithdrawalAmountsData = {
  withdrawalAmountDegen: number | null;
  withdrawalAmountBase: number | null;
  withdrawalAmountArbitrum: number | null;
};

export type WithdrawIssuerData = {
  address: Address;
  amountCrypto: string;
  amountUSD: number;
  withdrawalAmounts: WithdrawalAmountsData;
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

export type BountyCreatedEventData =
  BountyBaseData;

export type BountyJoinedEventData = {
  participant: {
    address: Address;
    amountCrypto: string;
    amountUSD: number;
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

export type WithdrawFromOpenBountyEventData = {
  issuer: WithdrawIssuerData;
  bounty: BountyWithParticipantsData;
};

export type WithdrawalEventData = {
  issuer: WithdrawIssuerData;
};

export type WithdrawalToEventData = {
  to: Address;
  issuer: WithdrawIssuerData;
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
      event: "WithdrawFromOpenBounty";
      data: WithdrawFromOpenBountyEventData;
    }
  | {
      event: "Withdrawal";
      data: WithdrawalEventData;
    }
  | {
      event: "WithdrawalTo";
      data: WithdrawalToEventData;
    }
  | {
      event: "VotingStarted";
      data: VotingStartedEventData;
    };
