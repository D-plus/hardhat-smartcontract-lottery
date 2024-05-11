import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import "hardhat-gas-reporter";
import "dotenv/config";
import "solidity-coverage";
import "hardhat-deploy";
import { HardhatUserConfig } from "hardhat/config";

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://eth-sepolia";
const SEPOLIA_CHAIN_ID = +process.env.SEPOLIA_CHAIN_ID! || 2;

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xKey";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "key";
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "key";

const config: HardhatUserConfig = {
  solidity: "0.8.8",
  defaultNetwork: "hardhat",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: SEPOLIA_CHAIN_ID,
      // Custom blockConfiramtions field to reference it in the deploy-raffle file. 6 blocks, to give Etherscan to index our transaction
      //@ts-ignore
      blockConfiramtions: 6,
    },
    localhost: {
      // url: "http://127.0.0.1:8545/",
      chainId: 31337,
      //@ts-ignore
      blockConfiramtions: 1,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    customChains: [],
  },
  gasReporter: {
    enabled: true,
    outputFile: "gas-report.txt",
    noColors: true,
    currency: "USD",
    coinmarketcap: COINMARKETCAP_API_KEY,
    // token: "MATIC",
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
  paths: {
    tests: "./tests",
  },
  mocha: {
    timeout: 500000, // 500 seconds
  },
};

export default config;
