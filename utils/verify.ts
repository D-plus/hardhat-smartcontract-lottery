import { run } from "hardhat";

export const verify = async (contractAddress: string, args: any) => {
  console.log("Verifying the contract:) ", args);

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e: any) {
    if (e.message.toLowerCase().includes("already verifyed")) {
      console.log("Already verifyed");
    } else {
      console.log(e);
    }
  }
};
