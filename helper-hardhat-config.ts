import { BigNumber } from "ethers";
import { ethers } from "hardhat";

interface INetworkConfigItem {
  name?: string;
  vrfCoordinatorV2?: string;
  blockConfirmations?: number;
  entranceFee?: BigNumber;
  gasLane?: string;
  subscriptionId?: string;
  callbackGasLimit?: string;
  interval?: string;
}

interface INetworkConfigInfo {
  [id: number]: INetworkConfigItem;
}

export const networkConfig: INetworkConfigInfo = {
  11155111: {
    name: "sepolia",
    vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    entranceFee: ethers.utils.parseEther("0.01"), // 0.01 ETH
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    subscriptionId: "11479",
    interval: "30", // 30 sec // keepers update interval
    callbackGasLimit: "500000", // 500,000 gas
  },
  31337: {
    // name: "hardhat",
    // subscriptionId: "588",
    // entranceFee: ethers.utils.parseEther("0.01"),
    // gasLane:
    //   "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    // callbackGasLimit: "500000",
    // interval: "30", // 30 sec
    name: "localhost",
    subscriptionId: "1",
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
    interval: "30",
    entranceFee: ethers.utils.parseEther("0.01"), // 0.01 ETH
    callbackGasLimit: "500000", // 500,000 gas
  },
};

export const developmentChains = ["hardhat", "localhost"];
