import { createConfig } from "@ponder/core";
import { http } from "viem";
import PoidhV2ABI from "./abis/PoidhV2Abi";
import PoidhV2NFTABI from "./abis/PoidhV2NFTAbi";

export default createConfig({
  networks: {
    base: {
      chainId: 8453,
      transport: http(process.env.BASE_RPC_URL),
    },
    degen: {
      chainId: 666666666,
      transport: http(process.env.DEGEN_RPC_URL),
    },
    arbitrum: {
      chainId: 42161,
      transport: http(process.env.ARBITRUM_RPC_URL),
    },
  },
  contracts: {
    // base
    PoidhBaseContract: {
      network: "base",
      abi: PoidhV2ABI,
      address: "0xb502c5856F7244DccDd0264A541Cc25675353D39",
      startBlock: 14542727,
    },
    PoidhNFTBaseContract: {
      network: "base",
      abi: PoidhV2NFTABI,
      address: "0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80",
      startBlock: 14542570,
    },
    // degen
    PoidhDegenContract: {
      network: "degen",
      abi: PoidhV2ABI,
      address: "0x2445BfFc6aB9EEc6C562f8D7EE325CddF1780814",
      startBlock: 6991084,
    },
    PoidhNFTDegenContract: {
      network: "degen",
      abi: PoidhV2NFTABI,
      address: "0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80",
      startBlock: 4857281,
    },
    // arbitrum
    PoidhArbitrumContract: {
      network: "arbitrum",
      abi: PoidhV2ABI,
      address: "0x0Aa50ce0d724cc28f8F7aF4630c32377B4d5c27d",
      startBlock: 211898523,
    },
    PoidhNFTArbitrumContract: {
      network: "arbitrum",
      abi: PoidhV2NFTABI,
      address: "0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80",
      startBlock: 211898311,
    },
  },
});
