import { ethers, network } from "hardhat";
import { Raffle } from "../typechain-types";
import { networkConfig } from "../helper-hardhat-config";

async function mockKeepers() {
  const raffle: Raffle = await ethers.getContract("Raffle");
  const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
  console.log("here ", (await raffle.getNumberOfPlayers()).toString());
  console.log((await raffle.getRaffleState()).toString());
  console.log((await raffle.getLatestTimestamp()).toString());
  console.log((await raffle.getContractBalance()).toString());

  // increase time on local network since block.timestamp deos not change at times so that it will go through checkUpkeep bool timePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
  console.log(
    "networkConfig[network.config.chainId!].interval here ",
    networkConfig[network.config.chainId!].interval
  );
  await network.provider.send("evm_increaseTime", [
    networkConfig[network.config.chainId!].interval! + 1,
  ]);
  await network.provider.send("evm_mine", []);

  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(checkData);
  console.log("upkeepNeeded ", upkeepNeeded);
  if (upkeepNeeded) {
    const tx = await raffle.performUpkeep(checkData);
    const txReceipt = await tx.wait(1);
    const requestId = txReceipt.events?.[1].args!.requestId;
    console.log(
      `Performed upkeep with RequestId: ${requestId}, for Chain ID: ${network.config.chainId}`
    );

    if (network.config.chainId == 31337) {
      await mockVrf(requestId, raffle);
    }
  } else {
    console.log("No upkeep needed!");
  }
}

async function mockVrf(requestId: string, raffle: Raffle) {
  console.log("We on a local network? Ok let's pretend...");
  const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
  await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address);
  console.log("Responded!");
  const recentWinner = await raffle.getRecentWinner();
  console.log(`The winner is: ${recentWinner}`);
}

mockKeepers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
