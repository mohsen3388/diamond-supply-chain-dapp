const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const [
        admin, buyer, retailer, mine,
        manufacturer, insurer, logistics
    ] = await hre.ethers.getSigners();

    const DiamondSupplyChain = await hre.ethers.getContractFactory("DiamondSupplyChain");
    const contract = await DiamondSupplyChain.deploy(admin.address);
    await contract.waitForDeployment();

    await contract.grantRole(await contract.BUYER_ROLE(), buyer.address);
    await contract.grantRole(await contract.RETAILER_ROLE(), retailer.address);
    await contract.grantRole(await contract.MINE_ROLE(), mine.address);
    await contract.grantRole(await contract.MANUFACTURER_ROLE(), manufacturer.address);
    await contract.grantRole(await contract.INSURANCE_ROLE(), insurer.address);
    await contract.grantRole(await contract.LOGISTICS_ROLE(), logistics.address);

    const rows = [];

    async function measure(name, txPromise) {
        const tx = await txPromise;
        const receipt = await tx.wait();
        rows.push({
            function: name,
            gasUsed: receipt.gasUsed.toString()
        });
        console.log(`${name}: ${receipt.gasUsed.toString()} gas`);
    }

    await measure(
        "createPurchaseRequest",
        contract.connect(buyer).createPurchaseRequest("Lesotho Mine")
    );

    await measure(
        "publishOrder",
        contract.connect(retailer).publishOrder(0)
    );

    await measure(
        "purchaseRoughDiamond",
        contract.connect(manufacturer).purchaseRoughDiamond(0)
    );

    await measure(
        "registerMining",
        contract.connect(mine).registerMining(0, "Lesotho Mine")
    );

    await measure(
        "approveQuality",
        contract.connect(manufacturer).approveQuality(0, "QC-HASH-001")
    );

    await measure(
        "issueInsurance",
        contract.connect(insurer).issueInsurance(0)
    );

    await measure(
        "updateTransport",
        contract.connect(logistics).updateTransport(0, "Cape Town")
    );

    await measure(
        "inspectShipment",
        contract.connect(retailer).inspectShipment(0)
    );

    await measure(
        "approveQualityAfterInspection",
        contract.connect(manufacturer).approveQuality(0, "QC-HASH-002")
    );

    await measure(
        "gradeDiamond",
        contract.connect(manufacturer).gradeDiamond(0, "GRADE-HASH-001")
    );

    await measure(
        "updateTransportToSeville",
        contract.connect(logistics).updateTransport(0, "Seville")
    );

    await measure(
        "confirmDelivery",
        contract.connect(retailer).confirmDelivery(0, "Seville Jewellery Shop")
    );

    await measure(
        "markRetailReady",
        contract.connect(retailer).markRetailReady(0)
    );

    if (!fs.existsSync("docs")) {
        fs.mkdirSync("docs");
    }

    fs.writeFileSync(
        "docs/gas-report.json",
        JSON.stringify(rows, null, 2)
    );

    const csv =
        "Function,GasUsed\n" +
        rows.map(r => `${r.function},${r.gasUsed}`).join("\n");

    fs.writeFileSync("docs/gas-report.csv", csv);

    console.log("\nGas report saved to docs/gas-report.json and docs/gas-report.csv");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});