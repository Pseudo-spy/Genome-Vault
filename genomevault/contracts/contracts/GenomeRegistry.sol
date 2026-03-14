// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract GenomeRegistry is Ownable, ReentrancyGuard, Pausable {

    struct GenomeDataset {
        bytes32  datasetHash;
        string   ipfsCID;
        address  owner;
        uint256  timestamp;
        uint256  price;         // in wei
        bool     isActive;
        string   signatureHash;
        string   metadata;      // JSON: ancestry, sequencingType, etc.
        uint256  accessCount;
    }

    struct AuditLog {
        string   actionType;    // uploadGenome | requestAccess | approveAccess | downloadData
        address  actor;
        bytes32  datasetId;
        string   signatureHash;
        uint256  timestamp;
    }

    // datasetId => GenomeDataset
    mapping(bytes32 => GenomeDataset) public datasets;
    // owner => list of datasetIds
    mapping(address => bytes32[]) public ownerDatasets;
    // audit logs
    AuditLog[] public auditLogs;
    bytes32[] public allDatasetIds;

    event GenomeRegistered(bytes32 indexed datasetId, address indexed owner, string ipfsCID, uint256 price);
    event DatasetPriceUpdated(bytes32 indexed datasetId, uint256 newPrice);
    event DatasetDeactivated(bytes32 indexed datasetId);
    event AuditLogCreated(string actionType, address actor, bytes32 datasetId, uint256 timestamp);

    modifier onlyDatasetOwner(bytes32 _datasetId) {
        require(datasets[_datasetId].owner == msg.sender, "Not dataset owner");
        _;
    }

    modifier datasetExists(bytes32 _datasetId) {
        require(datasets[_datasetId].owner != address(0), "Dataset does not exist");
        _;
    }

    function registerGenome(
        bytes32  _datasetHash,
        string   calldata _ipfsCID,
        uint256  _price,
        string   calldata _signatureHash,
        string   calldata _metadata
    ) external nonReentrant whenNotPaused returns (bytes32) {
        bytes32 datasetId = keccak256(
            abi.encodePacked(_datasetHash, msg.sender, block.timestamp)
        );
        require(datasets[datasetId].owner == address(0), "Dataset already registered");

        datasets[datasetId] = GenomeDataset({
            datasetHash:    _datasetHash,
            ipfsCID:        _ipfsCID,
            owner:          msg.sender,
            timestamp:      block.timestamp,
            price:          _price,
            isActive:       true,
            signatureHash:  _signatureHash,
            metadata:       _metadata,
            accessCount:    0
        });

        ownerDatasets[msg.sender].push(datasetId);
        allDatasetIds.push(datasetId);

        _addAuditLog("uploadGenome", msg.sender, datasetId, _signatureHash);
        emit GenomeRegistered(datasetId, msg.sender, _ipfsCID, _price);
        return datasetId;
    }

    function getGenomeMetadata(bytes32 _datasetId)
        external view datasetExists(_datasetId)
        returns (GenomeDataset memory)
    {
        return datasets[_datasetId];
    }

    function getOwnerDatasets(address _owner) external view returns (bytes32[] memory) {
        return ownerDatasets[_owner];
    }

    function getAllDatasets() external view returns (bytes32[] memory) {
        return allDatasetIds;
    }

    function updatePrice(bytes32 _datasetId, uint256 _newPrice)
        external onlyDatasetOwner(_datasetId)
    {
        datasets[_datasetId].price = _newPrice;
        emit DatasetPriceUpdated(_datasetId, _newPrice);
    }

    function deactivateDataset(bytes32 _datasetId)
        external onlyDatasetOwner(_datasetId)
    {
        datasets[_datasetId].isActive = false;
        emit DatasetDeactivated(_datasetId);
    }

    function incrementAccessCount(bytes32 _datasetId) external {
        datasets[_datasetId].accessCount++;
    }

    function _addAuditLog(
        string memory _actionType,
        address _actor,
        bytes32 _datasetId,
        string memory _signatureHash
    ) internal {
        auditLogs.push(AuditLog({
            actionType:    _actionType,
            actor:         _actor,
            datasetId:     _datasetId,
            signatureHash: _signatureHash,
            timestamp:     block.timestamp
        }));
        emit AuditLogCreated(_actionType, _actor, _datasetId, block.timestamp);
    }

    function addAuditLog(
        string calldata _actionType,
        address _actor,
        bytes32 _datasetId,
        string calldata _signatureHash
    ) external {
        _addAuditLog(_actionType, _actor, _datasetId, _signatureHash);
    }

    function getAuditLogs() external view returns (AuditLog[] memory) {
        return auditLogs;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
