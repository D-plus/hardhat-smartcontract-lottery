import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { developmentChains, networkConfig } from "../helper-hardhat-config";
import { verify } from "../utils/verify";

const VRF_SUBSCRIPTION_FUND_AMOUNT = ethers.utils.parseEther("2");

const deployRaffle: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId: number = network.config.chainId!;
  let vrfCoordinatorV2Address: string;
  let subscriptionId: string;

  if (developmentChains.includes(network.name)) {
    log("Local network detected!");
    log("Creating VRF2 Subscription...");

    const vrfCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;

    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transcationReceipt = await transactionResponse.wait(1);
    subscriptionId = transcationReceipt.events[0].args.subId;
    // Fund the subscription
    // Usually, we would need the link token on real network
    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUBSCRIPTION_FUND_AMOUNT
    );
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2!;
    subscriptionId = networkConfig[chainId].subscriptionId!;
  }

  const entranceFee = networkConfig[chainId].entranceFee;
  const gasLane = networkConfig[chainId].gasLane;
  const callbackGasLimit = networkConfig[chainId].callbackGasLimit;
  const interval = networkConfig[chainId].interval;
  const args = [
    vrfCoordinatorV2Address,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];
  console.log("args ", args);
  const raffle = await deploy("Raffle", {
    from: deployer,
    args,
    log: true,
    //@ts-ignore
    waitConfirmations: network.config.blockConfiramtions || 1,
  });

  // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
  // if (developmentChains.includes(network.name)) {
  //   log(`Adding Consumer...`);
  //   const vrfCoordinatorV2Mock = await ethers.getContract(
  //     "VRFCoordinatorV2Mock"
  //   );
  //   await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
  //   log(`Consumer Successfully Added!`);
  // }

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(raffle.address, args);
  }

  log("-------------------------");
};

deployRaffle.tags = ["all", "raffle"];
export default deployRaffle;
