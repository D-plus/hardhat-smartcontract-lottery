// @ts-ignore
import { network, getNamedAccounts, ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { developmentChains } from "../../helper-hardhat-config";
import { Raffle } from "../../typechain-types";

chai.use(solidity);

/** @dev
 To run staging tests:
  1. Get our SubId for Chainling VRF
  2. Deploy our contract using the SubId
  3. Register the contract with Chainlink VRF and it`s subId
  4. Register the contract with Chainlink Keepers
  5. Run staging tests
*/

developmentChains.includes(network.name)
  ? describe.skip
  : xdescribe("Raffle Staging tests", () => {
      let raffle: Raffle;
      let raffleEntranceFee: BigNumber;
      let deployer: SignerWithAddress;

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        raffle = await ethers.getContract("Raffle", deployer);
        raffleEntranceFee = await raffle.getEntranceFee();
      });

      it("works with live ChainLink Keepers and ChainLink VRF, we get a random winner", async () => {
        const startingTimeStamp = await raffle.getLatestTimestamp();
        const accounts = await ethers.getSigners();

        console.log("Setting up test...");
        await new Promise(async (resolve, reject) => {
          // setup listener before we enter the raffle
          raffle.once("WinnerPicked", async () => {
            console.log("WinnerPicked event!");
            try {
              // winner picked do asserts
              const endingTimeStamp = await raffle.getLatestTimestamp();
              const winner = await raffle.getRecentWinner();
              const winnersEndingBalance = await accounts[0].getBalance();
              const raffleState = await raffle.getRaffleState();

              await expect(raffle.getPlayer(0)).to.be.reverted; // since there should not be any players by index 0 and transaction reverts in this case
              await expect(winner.toString()).to.equal(accounts[0].address); // account[0] is our deployer
              await expect(raffleState).to.equal(0);
              assert.equal(
                winnersEndingBalance.toString(),
                winnersStartingBalance.add(raffleEntranceFee).toString()
              );
              assert(endingTimeStamp > startingTimeStamp);
              console.log("all good");
              resolve(true);
            } catch (e) {
              console.log(e);
              reject(e);
            }
          });

          // Entering the raffle
          console.log("Entering Raffle...");
          const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
          await tx.wait(1);
          console.log("Ok, time to wait...");
          const winnersStartingBalance = await accounts[0].getBalance();
        });
      });
    });
