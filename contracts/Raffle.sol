// Raffle
// Enter the lottery (paying some amount)
// Pick a random winer (verifiably random)
// Winner to be selected every X minutes => completely automate
// Chainlink Oracle => Randomness, Automated Execution (Chainlink Keepers)

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
// import "hardhat/console.sol";

error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__performUpkeepIsNotAvailable(
  uint256 raffleBalance,
  uint256 amountOfPlayers,
  uint256 raffleState
);

/**
 * @title A sample Raffle Contract
 * @author Dmytro Burzak
 * @notice This contract is for creating untamperable decentralized lottery smart contract
 * @dev This implements Chainlink VRF v2 and Chainlink Keepers
 */
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
  /* Type declarations */
  enum RaffleState {
    OPEN,
    CALCULATING
  }

  /* State Variables */
  uint256 private immutable i_entranceFee;
  address payable[] private s_players;
  VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
  bytes32 private immutable i_gasLane;
  uint64 private immutable i_subscriptionId;
  uint32 private immutable i_callbackGasLimit;
  uint256 private s_lastTimeStamp;
  uint256 private immutable i_interval;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private constant NUM_WORDS = 1;

  // Lottery Variables
  address private s_recentWinner;
  RaffleState private s_raffleState;

  /* Events */
  event RaffleEnter(address indexed player);
  event RequestedRaffleWinner(uint256 indexed requestId);
  event WinnerPicked(address indexed winner);

  /* Functions */
  constructor(
    address vrfCoordinatorV2, // contract
    uint256 entranceFee,
    bytes32 gasLane,
    uint64 subscriptionId,
    uint32 callbackGasLimit,
    uint256 interval // keepers update interval
  ) VRFConsumerBaseV2(vrfCoordinatorV2) {
    i_entranceFee = entranceFee;
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
    i_gasLane = gasLane;
    i_subscriptionId = subscriptionId;
    i_callbackGasLimit = callbackGasLimit;
    s_raffleState = RaffleState.OPEN;
    s_lastTimeStamp = block.timestamp;
    i_interval = interval;
  }

  function enterRaffle() public payable {
    if (msg.value < i_entranceFee) {
      revert Raffle__NotEnoughETHEntered();
    }

    if (s_raffleState != RaffleState.OPEN) {
      revert Raffle__NotOpen();
    }

    // after a user enters the raffle - set last timestamp from this point in time so that other users have time to join and raffle pick winner from this point in time after `interval` seconds
    s_lastTimeStamp = block.timestamp;

    s_players.push(payable(msg.sender));

    emit RaffleEnter(msg.sender);
  }

  /**
   * @dev This is the function that the ChainLink Keeper nodes call
   * they look for the `upkeepNeeded` return true.
   * The following should be true to return true:
   * 1. Our time interval should have past;
   * 2. The lottery should have at least 1 player, and have some ETH;
   * 3. Our subscription is funded with LINK;
   * 4. The lottery should be in the "open" state.
   */
  function checkUpkeep(
    bytes memory /*checkData*/
  ) public override returns (bool upkeepNeeded, bytes memory /*performData*/) {
    bool isOpen = s_raffleState == RaffleState.OPEN;
    bool timePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
    bool hasEnoughPlayers = s_players.length > 0;
    bool hasBalance = address(this).balance > 0;

    upkeepNeeded = isOpen && timePassed && hasEnoughPlayers && hasBalance;
  }

  // It is called when checkUpkeep returns true
  function performUpkeep(bytes calldata /*performData*/) external override {
    // Request the random number
    // Once we get it, do something with it
    // 2 transaction process
    (bool upkeepNeeded, ) = checkUpkeep("");
    if (!upkeepNeeded) {
      revert Raffle__performUpkeepIsNotAvailable(
        address(this).balance,
        s_players.length,
        uint256(s_raffleState)
      );
    }

    s_raffleState = RaffleState.CALCULATING;

    uint256 requestId = i_vrfCoordinator.requestRandomWords(
      i_gasLane,
      i_subscriptionId,
      REQUEST_CONFIRMATIONS,
      i_callbackGasLimit,
      NUM_WORDS
    );

    emit RequestedRaffleWinner(requestId);
  }

  function fulfillRandomWords(
    uint256 /*requestId,*/,
    uint256[] memory randomWords
  ) internal override {
    uint256 indexOfwinner = randomWords[0] % s_players.length;
    address payable recentWinner = s_players[indexOfwinner];

    s_recentWinner = recentWinner;

    (bool success, ) = recentWinner.call{value: address(this).balance}("");

    s_players = new address payable[](0);
    s_raffleState = RaffleState.OPEN;
    s_lastTimeStamp = block.timestamp;

    if (!success) {
      revert Raffle__TransferFailed();
    }

    emit WinnerPicked(recentWinner);
  }

  /* View / Pure */
  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getPlayer(uint256 index) public view returns (address) {
    return s_players[index];
  }

  function getRecentWinner() public view returns (address) {
    return s_recentWinner;
  }

  function getRaffleState() public view returns (RaffleState) {
    return s_raffleState;
  }

  function getNumWords() public pure returns (uint32) {
    return NUM_WORDS;
  }

  function getNumberOfPlayers() public view returns (uint256) {
    return s_players.length;
  }

  function getLatestTimestamp() public view returns (uint256) {
    return s_lastTimeStamp;
  }

  function getInterval() public view returns (uint256) {
    return i_interval;
  }

  function getRequestConformations() public pure returns (uint256) {
    return REQUEST_CONFIRMATIONS;
  }

  function getContractBalance() public view returns (uint256) {
    return address(this).balance;
  }
}
