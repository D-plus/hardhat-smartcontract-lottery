import { DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";
import { developmentChains } from "../helper-hardhat-config";

const BASE_FEE = ethers.utils.parseEther("0.25"); // 0.25 is the premium. It costs 0.25 LINK to make a request
const GAS_PRICE_LINK = 1e9; // 100000000 // link per gas. calculated value based on the gas price of the chain

const deployMocks: DeployFunction = async function ({
  getNamedAccounts,
  deployments,
}) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  if (developmentChains.includes(network.name)) {
    log("Local network detected! Deploying mocks...");
    // depoloy a mock vrfCoordinator
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_PRICE_LINK],
    });

    log("Mocks deployed!");

    log("------------------");
  }
};

deployMocks.tags = ["all", "mocks"];

export default deployMocks;
