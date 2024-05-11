/**@dev
 * update constants in the frontend folder with latest data about deployed contract (abi, contract address, etc.)
 * */

import fs from "fs";
import { ethers, network } from "hardhat";

const FRONTEND_ADRESSES_FILE =
  "../nextjs-smartcontract-lottery/constants/contractAddress.json";
const FRONTEND_ABI_FILE = "../nextjs-smartcontract-lottery/constants/abi.json";

async function updateContractAddress() {
  const contract = await ethers.getContract("Raffle");
  const currentAddresses = JSON.parse(
    fs.readFileSync(FRONTEND_ADRESSES_FILE, "utf-8")
  );
  const chainId = network.config.chainId!;

  if (chainId in currentAddresses) {
    if (!currentAddresses[chainId].includes(contract.address)) {
      // if contract.address is not on the list yet than
      currentAddresses[chainId].push(contract.address);
    }
  } else {
    currentAddresses[chainId] = [contract.address];
  }

  fs.writeFileSync(FRONTEND_ADRESSES_FILE, JSON.stringify(currentAddresses));
}

async function updateAbi() {
  const contract = await ethers.getContract("Raffle");
  fs.writeFileSync(
    FRONTEND_ABI_FILE,
    contract.interface.format(ethers.utils.FormatTypes.json) as string
  );
}

async function updateFEConstants() {
  if (process.env.UPDATE_FRONTEND_CONSTANTS) {
    console.log("Updating Front End...");

    updateContractAddress();
    updateAbi();
  }
}
updateFEConstants.tags = ["all", "frontend"];
export default updateFEConstants;
