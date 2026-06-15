// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract DiamondSupplyChain is ERC721, AccessControl {
    bytes32 public constant BUYER_ROLE = keccak256("BUYER_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant MINE_ROLE = keccak256("MINE_ROLE");
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant INSURANCE_ROLE = keccak256("INSURANCE_ROLE");
    bytes32 public constant LOGISTICS_ROLE = keccak256("LOGISTICS_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    enum DiamondState {
        Created,
        OrderPublished,
        RoughPurchased,
        Mined,
        QualityApproved,
        Insured,
        InTransit,
        Inspected,
        Graded,
        Delivered,
        RetailReady
    }

    struct Diamond {
        uint256 tokenId;
        string origin;
        string currentLocation;
        string certificateHash;
        DiamondState state;
        bool exists;
    }

    uint256 private _nextTokenId;

    mapping(uint256 => Diamond) private diamonds;
    mapping(uint256 => string[]) private traceabilityRecords;

    event PurchaseRequestCreated(uint256 indexed tokenId, address indexed buyer, string origin);
    event OrderPublished(uint256 indexed tokenId, address indexed retailer);
    event DiamondMined(uint256 indexed tokenId, address indexed mine, string location);
    event QualityApproved(uint256 indexed tokenId, address indexed actor, string certificateHash);
    event InsuranceIssued(uint256 indexed tokenId, address indexed insurer);
    event TransportUpdated(uint256 indexed tokenId, address indexed logistics, string location);
    event InspectionCompleted(uint256 indexed tokenId, address indexed actor);
    event DiamondGraded(uint256 indexed tokenId, address indexed manufacturer, string certificateHash);
    event DeliveryConfirmed(uint256 indexed tokenId, address indexed retailer, string location);
    event RetailReady(uint256 indexed tokenId, address indexed retailer);

    constructor(address admin) ERC721("DiamondTraceabilityToken", "DTT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        _grantRole(BUYER_ROLE, admin);
        _grantRole(RETAILER_ROLE, admin);
        _grantRole(MINE_ROLE, admin);
        _grantRole(MANUFACTURER_ROLE, admin);
        _grantRole(INSURANCE_ROLE, admin);
        _grantRole(LOGISTICS_ROLE, admin);
        _grantRole(AUDITOR_ROLE, admin);
    }

    function createPurchaseRequest(string memory origin)
        external
        onlyRole(BUYER_ROLE)
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(msg.sender, tokenId);

        diamonds[tokenId] = Diamond({
            tokenId: tokenId,
            origin: origin,
            currentLocation: "Purchase request created",
            certificateHash: "",
            state: DiamondState.Created,
            exists: true
        });

        traceabilityRecords[tokenId].push("Purchase request created");
        emit PurchaseRequestCreated(tokenId, msg.sender, origin);

        return tokenId;
    }

    function publishOrder(uint256 tokenId) external onlyRole(RETAILER_ROLE) {
        _requireDiamond(tokenId);
        require(diamonds[tokenId].state == DiamondState.Created, "Invalid state");

        diamonds[tokenId].state = DiamondState.OrderPublished;
        traceabilityRecords[tokenId].push("Order published by retailer");

        emit OrderPublished(tokenId, msg.sender);
    }

    function purchaseRoughDiamond(uint256 tokenId)
        external
        onlyRole(MANUFACTURER_ROLE)
    {
        _requireDiamond(tokenId);
        require(
            diamonds[tokenId].state == DiamondState.OrderPublished,
            "Invalid state"
        );

        diamonds[tokenId].state = DiamondState.RoughPurchased;
        traceabilityRecords[tokenId].push("Rough diamond purchased");

        emit TransportUpdated(tokenId, msg.sender, "Rough diamond purchased");
    }

    function registerMining(uint256 tokenId, string memory location)
        external
        onlyRole(MINE_ROLE)
    {
        _requireDiamond(tokenId);
        require(
            diamonds[tokenId].state == DiamondState.RoughPurchased,
            "Invalid state"
        );

        diamonds[tokenId].state = DiamondState.Mined;
        diamonds[tokenId].currentLocation = location;
        traceabilityRecords[tokenId].push("Diamond mined");

        emit DiamondMined(tokenId, msg.sender, location);
    }

    function approveQuality(uint256 tokenId, string memory certificateHash)
        external
        onlyRole(MANUFACTURER_ROLE)
    {
        _requireDiamond(tokenId);
        require(
            diamonds[tokenId].state == DiamondState.Mined ||
                diamonds[tokenId].state == DiamondState.Inspected,
            "Invalid state"
        );

        diamonds[tokenId].state = DiamondState.QualityApproved;
        diamonds[tokenId].certificateHash = certificateHash;
        traceabilityRecords[tokenId].push("Quality approved");

        emit QualityApproved(tokenId, msg.sender, certificateHash);
    }

    function issueInsurance(uint256 tokenId)
        external
        onlyRole(INSURANCE_ROLE)
    {
        _requireDiamond(tokenId);
        require(
            diamonds[tokenId].state == DiamondState.QualityApproved,
            "Quality approval required"
        );

        diamonds[tokenId].state = DiamondState.Insured;
        traceabilityRecords[tokenId].push("Insurance issued");

        emit InsuranceIssued(tokenId, msg.sender);
    }

    function updateTransport(uint256 tokenId, string memory location)
        external
        onlyRole(LOGISTICS_ROLE)
    {
        _requireDiamond(tokenId);
        require(
            diamonds[tokenId].state == DiamondState.Insured ||
                diamonds[tokenId].state == DiamondState.Graded,
            "Insurance or grading required before transport"
        );

        diamonds[tokenId].state = DiamondState.InTransit;
        diamonds[tokenId].currentLocation = location;
        traceabilityRecords[tokenId].push(location);

        emit TransportUpdated(tokenId, msg.sender, location);
    }

    function inspectShipment(uint256 tokenId)
        external
        onlyRole(RETAILER_ROLE)
    {
        _requireDiamond(tokenId);
        require(
            diamonds[tokenId].state == DiamondState.InTransit,
            "Shipment must be in transit"
        );

        diamonds[tokenId].state = DiamondState.Inspected;
        traceabilityRecords[tokenId].push("Shipment inspected");

        emit InspectionCompleted(tokenId, msg.sender);
    }

    function gradeDiamond(uint256 tokenId, string memory certificateHash)
        external
        onlyRole(MANUFACTURER_ROLE)
    {
        _requireDiamond(tokenId);
        require(
            diamonds[tokenId].state == DiamondState.QualityApproved,
            "Quality approval required"
        );

        diamonds[tokenId].state = DiamondState.Graded;
        diamonds[tokenId].certificateHash = certificateHash;
        traceabilityRecords[tokenId].push("Diamond graded");

        emit DiamondGraded(tokenId, msg.sender, certificateHash);
    }

    function confirmDelivery(uint256 tokenId, string memory location)
        external
        onlyRole(RETAILER_ROLE)
    {
        _requireDiamond(tokenId);
        require(
            diamonds[tokenId].state == DiamondState.InTransit,
            "Diamond must be in transit"
        );

        diamonds[tokenId].state = DiamondState.Delivered;
        diamonds[tokenId].currentLocation = location;
        traceabilityRecords[tokenId].push("Delivery confirmed");

        emit DeliveryConfirmed(tokenId, msg.sender, location);
    }

    function markRetailReady(uint256 tokenId)
        external
        onlyRole(RETAILER_ROLE)
    {
        _requireDiamond(tokenId);
        require(
            diamonds[tokenId].state == DiamondState.Delivered,
            "Delivery required"
        );

        diamonds[tokenId].state = DiamondState.RetailReady;
        traceabilityRecords[tokenId].push("Diamond ready for retail");

        emit RetailReady(tokenId, msg.sender);
    }

    function getDiamond(uint256 tokenId)
        external
        view
        returns (Diamond memory)
    {
        _requireDiamond(tokenId);
        return diamonds[tokenId];
    }

    function getTraceabilityRecords(uint256 tokenId)
        external
        view
        returns (string[] memory)
    {
        _requireDiamond(tokenId);
        return traceabilityRecords[tokenId];
    }

    function _requireDiamond(uint256 tokenId) internal view {
        require(diamonds[tokenId].exists, "Diamond does not exist");
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}