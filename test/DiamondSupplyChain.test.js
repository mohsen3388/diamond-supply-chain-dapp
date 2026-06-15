const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DiamondSupplyChain", function () {
    let contract;
    let admin;
    let buyer;
    let retailer;
    let mine;
    let manufacturer;
    let insurer;
    let logistics;
    let unauthorized;

    beforeEach(async function () {
        [
            admin,
            buyer,
            retailer,
            mine,
            manufacturer,
            insurer,
            logistics,
            unauthorized
        ] = await ethers.getSigners();

        const DiamondSupplyChain =
            await ethers.getContractFactory("DiamondSupplyChain");

        contract =
            await DiamondSupplyChain.deploy(admin.address);

        await contract.waitForDeployment();

        await contract.grantRole(await contract.BUYER_ROLE(), buyer.address);
        await contract.grantRole(await contract.RETAILER_ROLE(), retailer.address);
        await contract.grantRole(await contract.MINE_ROLE(), mine.address);
        await contract.grantRole(await contract.MANUFACTURER_ROLE(), manufacturer.address);
        await contract.grantRole(await contract.INSURANCE_ROLE(), insurer.address);
        await contract.grantRole(await contract.LOGISTICS_ROLE(), logistics.address);
    });

    it("Purchase Request Test: should create a purchase request and mint a diamond token", async function () {
        await expect(
            contract.connect(buyer).createPurchaseRequest("Lesotho Mine")
        ).to.emit(contract, "PurchaseRequestCreated");

        const diamond = await contract.getDiamond(0);

        expect(diamond.tokenId).to.equal(0);
        expect(diamond.origin).to.equal("Lesotho Mine");
        expect(diamond.currentLocation).to.equal("Purchase request created");
        expect(diamond.state).to.equal(0);
        expect(await contract.ownerOf(0)).to.equal(buyer.address);
    });

    it("Role Validation Test: should reject unauthorized purchase request creation", async function () {
        await expect(
            contract.connect(unauthorized).createPurchaseRequest("Lesotho Mine")
        ).to.be.reverted;
    });

    it("Lifecycle Test: should execute the main diamond supply-chain lifecycle", async function () {
        await contract.connect(buyer).createPurchaseRequest("Lesotho Mine");

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

        const diamond = await contract.getDiamond(0);

        expect(diamond.state).to.equal(10);
        expect(diamond.currentLocation).to.equal("Seville Jewellery Shop");
        expect(diamond.certificateHash).to.equal("GRADE-HASH-001");
    });

    it("Traceability Test: should store traceability records during process execution", async function () {
        await contract.connect(buyer).createPurchaseRequest("Lesotho Mine");
        await contract.connect(retailer).publishOrder(0);
        await contract.connect(manufacturer).purchaseRoughDiamond(0);
        await contract.connect(mine).registerMining(0, "Lesotho Mine");

        const records = await contract.getTraceabilityRecords(0);

        expect(records.length).to.equal(4);
        expect(records[0]).to.equal("Purchase request created");
        expect(records[1]).to.equal("Order published by retailer");
        expect(records[2]).to.equal("Rough diamond purchased");
        expect(records[3]).to.equal("Diamond mined");
    });
});