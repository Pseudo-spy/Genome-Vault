// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IAccessControl {
    function getRequest(bytes32 _requestId) external view returns (
        bytes32, bytes32, address, string memory, string memory,
        uint256, uint256, uint256, uint8, string memory, string memory
    );
    function approveAccess(bytes32, string calldata, string calldata) external;
}

interface IGenomeRegistry2 {
    function getGenomeMetadata(bytes32 _datasetId) external view returns (
        bytes32, string memory, address, uint256, uint256, bool, string memory, string memory, uint256
    );
}

contract PaymentContract is Ownable, ReentrancyGuard {

    uint256 public platformFeeBps = 500; // 5% platform commission (basis points)

    struct Payment {
        bytes32  requestId;
        bytes32  datasetId;
        address  researcher;
        address  dataOwner;
        uint256  amount;
        uint256  platformFee;
        uint256  ownerPayout;
        uint256  timestamp;
        bool     processed;
    }

    mapping(bytes32 => Payment)  public payments;
    mapping(address => uint256)  public ownerEarnings;
    mapping(address => uint256)  public ownerTotalAccesses;
    uint256 public totalPlatformRevenue;

    IAccessControl  public accessControl;
    IGenomeRegistry2 public genomeRegistry;

    event PaymentProcessed(bytes32 indexed requestId, address researcher, address owner, uint256 amount);
    event OwnerWithdrawal(address indexed owner, uint256 amount);
    event PlatformFeeUpdated(uint256 newFeeBps);

    constructor(address _accessControl, address _genomeRegistry) {
        accessControl  = IAccessControl(_accessControl);
        genomeRegistry = IGenomeRegistry2(_genomeRegistry);
    }

    function processPayment(
        bytes32 _requestId,
        bytes32 _datasetId,
        address _dataOwner,
        string calldata _encryptedKeyHash,
        string calldata _ownerSig
    ) external payable nonReentrant {
        require(msg.value > 0, "Payment required");
        require(!payments[_requestId].processed, "Already paid");

        uint256 fee    = (msg.value * platformFeeBps) / 10000;
        uint256 payout = msg.value - fee;

        payments[_requestId] = Payment({
            requestId:   _requestId,
            datasetId:   _datasetId,
            researcher:  msg.sender,
            dataOwner:   _dataOwner,
            amount:      msg.value,
            platformFee: fee,
            ownerPayout: payout,
            timestamp:   block.timestamp,
            processed:   true
        });

        ownerEarnings[_dataOwner]      += payout;
        ownerTotalAccesses[_dataOwner] += 1;
        totalPlatformRevenue           += fee;

        accessControl.approveAccess(_requestId, _encryptedKeyHash, _ownerSig);
        emit PaymentProcessed(_requestId, msg.sender, _dataOwner, msg.value);
    }

    function withdraw() external nonReentrant {
        uint256 amount = ownerEarnings[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        ownerEarnings[msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "Transfer failed");
        emit OwnerWithdrawal(msg.sender, amount);
    }

    function withdrawPlatformFees() external onlyOwner {
        uint256 amount = totalPlatformRevenue;
        totalPlatformRevenue = 0;
        (bool ok,) = payable(owner()).call{value: amount}("");
        require(ok, "Transfer failed");
    }

    function getOwnerEarnings(address _owner) external view returns (uint256) {
        return ownerEarnings[_owner];
    }

    function setPlatformFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 2000, "Max 20%");
        platformFeeBps = _feeBps;
        emit PlatformFeeUpdated(_feeBps);
    }

    receive() external payable {}
}
