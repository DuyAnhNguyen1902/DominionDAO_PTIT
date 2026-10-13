const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const DominionDAO = await hre.ethers.getContractFactory("DominionDAO");
  const dao = await DominionDAO.deploy();
  await dao.waitForDeployment();
  const address = await dao.getAddress();

  const artifact = await hre.artifacts.readArtifact("DominionDAO");
  const frontendContractDir = path.join(__dirname, "..", "frontend", "src", "contract");
  fs.mkdirSync(frontendContractDir, { recursive: true });
  fs.writeFileSync(
    path.join(frontendContractDir, "DominionDAO.json"),
    JSON.stringify({ address, abi: artifact.abi }, null, 2)
  );
  fs.writeFileSync(
    path.join(__dirname, "..", "deployment.json"),
    JSON.stringify({ network: hre.network.name, chainId: Number((await hre.ethers.provider.getNetwork()).chainId), address }, null, 2)
  );

  console.log(`DominionDAO deployed to ${address}`);
  console.log("Frontend contract configuration updated.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

