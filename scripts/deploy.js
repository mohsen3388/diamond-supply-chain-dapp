const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying with account:");
    console.log(deployer.address);

    const DiamondSupplyChain =
        await hre.ethers.getContractFactory("DiamondSupplyChain");

    const contract =
        await DiamondSupplyChain.deploy(deployer.address);

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();

    console.log("DiamondSupplyChain deployed at:");
    console.log(contractAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});