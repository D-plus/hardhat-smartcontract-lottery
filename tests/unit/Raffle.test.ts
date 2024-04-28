// @ts-ignore
import { network, getNamedAccounts, deployments, ethers } from "hardhat";
import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types";

chai.use(solidity);

developmentChains.includes(network.name)
  ? describe("Raffle Unit tests", () => {
      let raffle: Raffle;
      let VRFCoordinatorV2Mock: VRFCoordinatorV2Mock;
      let chainId: number = network.config.chainId!;
      let raffleEntranceFee: BigNumber;
      let deployer: SignerWithAddress;
      let interval: number;

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["mocks", "all"]);
        raffle = await ethers.getContract("Raffle", deployer);
        VRFCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        raffleEntranceFee = await raffle.getEntranceFee();
        interval = (await raffle.getInterval()).toNumber();
      });

      describe("constructor", () => {
        it("initialize the raffle state correctly", async () => {
          const raffleState = await raffle.getRaffleState();

          expect(raffleState.toString()).to.equal("0");
        });

        it("initialize the raffle interval correctly", async () => {
          expect(interval.toString()).to.equal(networkConfig[chainId].interval);
        });
      });

      describe("enterRaffle", () => {
        it("reverts when not enouth ETH entered", async () => {
          await expect(raffle.enterRaffle()).to.be.revertedWith(
            "Raffle__NotEnoughETHEntered"
          );
        });

        it("records players when they entered", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const playerFromContract = await raffle.getPlayer(0);

          expect(playerFromContract).to.equal(deployer);
        });

        it("emmits event on enter", async () => {
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.emit(raffle, "RaffleEnter");
        });

        // it("does not allow entrance when raffle is calculating", async () => {
        //   await raffle.enterRaffle({ value: raffleEntranceFee });
        //   await network.provider.send("evm_increaseTime", [
        //     interval.toNumber() + 1,
        //   ]);
        //   await network.provider.send("evm_mine", []);

        //   // We pretend to be a ChainLink Keeper
        //   await raffle.performUpkeep([]);

        //   await expect(
        //     raffle.enterRaffle({ value: raffleEntranceFee })
        //   ).to.be.revertedWith("Raffle__NotOpen");
        // });

        it("doesn't allow entrance when raffle is calculating", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval + 1]);
          await network.provider.request({ method: "evm_mine", params: [] });
          // we pretend to be a keeper for a second
          await raffle.performUpkeep([]);
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.be.revertedWith("Raffle__NotOpen");
        });
      });

      describe("checkUpkeep", () => {
        it("returns false if people haven`t sent any ETH", async () => {
          await network.provider.send("evm_increaseTime", [interval + 1]);
          await network.provider.send("evm_mine", []);

          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]); // callStatic simulates call of the function without sending transactions, since function is public it would send transaction otherwaise

          expect(upkeepNeeded).to.equal(false);
        });

        it("returns false if raffle is not open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval + 1]);
          await network.provider.request({ method: "evm_mine", params: [] });
          // we pretend to be a keeper for a second
          await raffle.performUpkeep([]); // to change state of the Raffle to CALCULATING
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          const raffleState = await raffle.getRaffleState();

          expect(raffleState.toString()).to.equal("1");
          expect(upkeepNeeded).to.equal(false);
        });

        it("returns false if enough time has not passed", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval - 1]);
          await network.provider.request({ method: "evm_mine", params: [] });
          // we pretend to be a keeper for a second
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);

          expect(upkeepNeeded).to.equal(false);
        });

        it("returns true if enough time passed", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval + 1]);
          await network.provider.request({ method: "evm_mine", params: [] });
          // we pretend to be a keeper for a second
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);

          expect(upkeepNeeded).to.equal(true);
        });
      });

      describe("performUpkeep", () => {
        it("can only run if checkUpkeep is true", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval + 1]);
          await network.provider.send("evm_mine", []);

          const tx = await raffle.performUpkeep([]);

          assert(tx);
        });

        it("updates the raffle state", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval + 1]);
          await network.provider.send("evm_mine", []);

          await raffle.performUpkeep([]);
          const raffleState = await raffle.getRaffleState();

          expect(raffleState).to.equal(1);
        });

        it("emits event correctly", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval + 1]);
          await network.provider.send("evm_mine", []);

          const txResponse = await raffle.performUpkeep([]);
          const txReceipt = await txResponse.wait(1);
          const requestId = txReceipt.events![1].args!.requestId;

          expect(requestId.toNumber() > 0).to.equal(true);
        });

        it("reverts when checkUpkeep is false", async () => {
          await expect(raffle.performUpkeep([])).to.be.revertedWith(
            "Raffle__performUpkeepIsNotAvailable(0, 0, 0)"
          );
        });
      });

      describe("fulfillRandomWords", () => {
        beforeEach(async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [interval + 1]);
          await network.provider.send("evm_mine", []);
        });

        it("does not call if performUpkeep was not called", async () => {
          await expect(
            VRFCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
          ).to.be.revertedWith("nonexistent request");
          await expect(
            VRFCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
          ).to.be.revertedWith("nonexistent request");
        });

        it("picks a winner, reset the lottery, and sends money", async () => {
          const startAccountIndex = 1; // 0 is deployer, 1 is user
          const additionalEntrantsAccounts = 3;
          const accounts: SignerWithAddress[] = await ethers.getSigners();

          for (
            let i = startAccountIndex;
            i < startAccountIndex + additionalEntrantsAccounts;
            i++
          ) {
            const accountConnectedRaffle = await raffle.connect(accounts[i]);
            await accountConnectedRaffle.enterRaffle({
              value: raffleEntranceFee,
            });
          }
          const startingTimeStamp = await raffle.getLatestTimestamp();

          // performUpkeep (mock being Chainlink Keepers)
          // fulfillRandomWords (mock being the Chainlink VRF)
          // We will have to wait for the fulfillRandomWords to be called
          await new Promise(async (resolve, reject) => {
            const winnersStartinBalance = await accounts[1].getBalance();
            // setting up the listener
            raffle.once("WinnerPicked", async () => {
              try {
                const recentWinner = await raffle.getRecentWinner();
                const winnerEndingBalance = await accounts[1].getBalance();
                const raffleState = await raffle.getRaffleState();
                const endingTimeStamp = await raffle.getLatestTimestamp();
                const numOfPlayers = await raffle.getNumberOfPlayers();

                assert(raffleState.toString(), "0");
                assert(numOfPlayers.toString(), "0");
                assert(endingTimeStamp > startingTimeStamp);

                assert(
                  // winners balance
                  winnerEndingBalance.toString(),
                  // balance of everybody who particiapted in the raffle
                  winnersStartinBalance
                    .add(
                      raffleEntranceFee
                        .mul(additionalEntrantsAccounts) // entrance fee by 3 entrants accounts
                        .add(raffleEntranceFee) // entrance fee from entrants account in beforEach
                    )
                    .toString()
                );
                resolve(true);
              } catch (e) {
                reject(e);
              }
            });

            // below, we will emit the event, and the listener will pick up, and resolve
            const tx = await raffle.performUpkeep([]);
            const txReceipt = await tx.wait(1);
            await VRFCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events![1].args!.requestId,
              raffle.address
            );
          });
        });
      });
    })
  : describe.skip;
