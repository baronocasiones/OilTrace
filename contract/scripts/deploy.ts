import { ethers } from "hardhat";

async function main() {
  const OilTrace = await ethers.getContractFactory("OilTrace");
  const oilTrace = await OilTrace.deploy();
  await oilTrace.waitForDeployment();
  const address = await oilTrace.getAddress();
  console.log("OilTrace deployed to:", address);

  const owner = await oilTrace.owner();
  console.log("Contract owner:", owner);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
