const hre = require("hardhat");

async function main() {
    const [
        admin,
        buyer,
        retailer,
        mine,
        manufacturer,
        insurer,
        logistics,
        unauthorized
    ] = await hre.ethers.getSigners();

    console.log("=== Diamond Supply Chain Execution Scenarios ===");

    const DiamondSupplyChain =
        await hre.ethers.getContractFactory("DiamondSupplyChain");

    const contract =
        await DiamondSupplyChain.deploy(admin.address);

    await contract.waitForDeployment();

    console.log("Contract deployed at:", await contract.getAddress());

    await contract.grantRole(await contract.BUYER_ROLE(), buyer.address);
    await contract.grantRole(await contract.RETAILER_ROLE(), retailer.address);
    await contract.grantRole(await contract.MINE_ROLE(), mine.address);
    await contract.grantRole(await contract.MANUFACTURER_ROLE(), manufacturer.address);
    await contract.grantRole(await contract.INSURANCE_ROLE(), insurer.address);
    await contract.grantRole(await contract.LOGISTICS_ROLE(), logistics.address);

    console.log("\nScenario 1: Purchase Request Creation");
    await contract.connect(buyer).createPurchaseRequest("Lesotho Mine");
    let diamond = await contract.getDiamond(0);
    console.log("Token ID:", diamond.tokenId.toString());
    console.log("Origin:", diamond.origin);
    console.log("State:", diamond.state.toString());
    console.log("Current Location:", diamond.currentLocation);

    console.log("\nScenario 2: Collaborative Lifecycle Execution");
    await contract.connect(retailer).publishOrder(0);
    await contract.connect(manufacturer).purchaseRoughDiamond(0);
    await contract.connect(mine).registerMining(0, "Lesotho Mine");
    await contract.connect(manufacturer).approveQuality(0, "QC-HASH-001");
    await contract.connect(insurer).issueInsurance(0);
    await contract.connect(logistics).updateTransport(0, "Cape Town");
    await contract.connect(retailer).inspectShipment(0);
    await contract.connect(manufacturer).approveQuality(0, "QC-HASH-002");
    await contract.connect(manufacturer).gradeDiamond(0, "GRADE-HASH-001");
    await contract.connect(logistics).updateTransport(0, "Seville");
    await contract.connect(retailer).confirmDelivery(0, "Seville Jewellery Shop");
    await contract.connect(retailer).markRetailReady(0);

    diamond = await contract.getDiamond(0);
    console.log("Final State:", diamond.state.toString());
    console.log("Final Location:", diamond.currentLocation);
    console.log("Certificate Hash:", diamond.certificateHash);

    console.log("\nScenario 3: Unauthorized Access Validation");
    try {
        await contract.connect(unauthorized).createPurchaseRequest("Unauthorized Mine");
        console.log("ERROR: Unauthorized transaction was accepted.");
    } catch (error) {
        console.log("Unauthorized transaction correctly rejected.");
    }

    console.log("\nScenario 4: Traceability Retrieval");
    const records = await contract.getTraceabilityRecords(0);

    for (let i = 0; i < records.length; i++) {
        console.log(`${i + 1}. ${records[i]}`);
    }

    console.log("\n=== Execution Scenarios Completed Successfully ===");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});