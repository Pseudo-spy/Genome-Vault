// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IGenomeRegistry {
    function getGenomeMetadata(bytes32 _datasetId) external view returns (
        bytes32, string memory, address, uint256, uint256, bool, string memory, string memory, uint256
    );
    function incrementAccessCount(bytes32 _datasetId) external;
    function addAuditLog(string calldata, address, bytes32, string calldata) external;
}

contract AccessControl is ReentrancyGuard {

    enum RequestStatus { Pending, Approved, Rejected, Revoked }

    struct AccessRequest {
        bytes32    requestId;
        bytes32    datasetId;
        address    researcher;
        string     researchObjective;
        string     fundingSource;
        uint256    durationDays;
        uint256    timestamp;
        uint256    approvedAt;
        RequestStatus status;
        string     signatureHash;
        string     encryptedKeyHash; // stored after approval
    }

    IGenomeRegistry public genomeRegistry;

    mapping(bytes32 => AccessRequest)   public requests;
    mapping(address => bytes32[])        public researcherRequests;
    mapping(bytes32 => bytes32[])        public datasetRequests;  // datasetId => requestIds
    mapping(bytes32 => mapping(address => bool)) public activeAccess; // datasetId => researcher => bool

    event AccessRequested(bytes32 indexed requestId, bytes32 indexed datasetId, address researcher);
    event AccessApproved(bytes32 indexed requestId, bytes32 indexed datasetId, address researcher);
    event AccessRejected(bytes32 indexed requestId);
    event AccessRevoked(bytes32 indexed requestId);

    constructor(address _genomeRegistry) {
        genomeRegistry = IGenomeRegistry(_genomeRegistry);
    }

    function requestAccess(
        bytes32 _datasetId,
        string calldata _researchObjective,
        string calldata _fundingSource,
        uint256 _durationDays,
        string calldata _signatureHash
    ) external nonReentrant returns (bytes32) {
        bytes32 requestId = keccak256(
            abi.encodePacked(_datasetId, msg.sender, block.timestamp, _signatureHash)
        );
        require(requests[requestId].researcher == address(0), "Request exists");

        requests[requestId] = AccessRequest({
            requestId:          requestId,
            datasetId:          _datasetId,
            researcher:         msg.sender,
            researchObjective:  _researchObjective,
            fundingSource:      _fundingSource,
            durationDays:       _durationDays,
            timestamp:          block.timestamp,
            approvedAt:         0,
            status:             RequestStatus.Pending,
            signatureHash:      _signatureHash,
            encryptedKeyHash:   ""
        });

        researcherRequests[msg.sender].push(requestId);
        datasetRequests[_datasetId].push(requestId);

        genomeRegistry.addAuditLog("requestAccess", msg.sender, _datasetId, _signatureHash);
        emit AccessRequested(requestId, _datasetId, msg.sender);
        return requestId;
    }

    function approveAccess(
        bytes32 _requestId,
        string calldata _encryptedKeyHash,
        string calldata _ownerSignatureHash
    ) external nonReentrant {
        AccessRequest storage req = requests[_requestId];
        require(req.researcher != address(0), "Request not found");
        require(req.status == RequestStatus.Pending, "Not pending");

        req.status           = RequestStatus.Approved;
        req.approvedAt       = block.timestamp;
        req.encryptedKeyHash = _encryptedKeyHash;

        activeAccess[req.datasetId][req.researcher] = true;
        genomeRegistry.incrementAccessCount(req.datasetId);
        genomeRegistry.addAuditLog("approveAccess", msg.sender, req.datasetId, _ownerSignatureHash);

        emit AccessApproved(_requestId, req.datasetId, req.researcher);
    }

    function rejectAccess(bytes32 _requestId) external {
        AccessRequest storage req = requests[_requestId];
        require(req.status == RequestStatus.Pending, "Not pending");
        req.status = RequestStatus.Rejected;
        genomeRegistry.addAuditLog("rejectAccess", msg.sender, req.datasetId, "");
        emit AccessRejected(_requestId);
    }

    function revokeAccess(bytes32 _requestId) external nonReentrant {
        AccessRequest storage req = requests[_requestId];
        require(req.status == RequestStatus.Approved, "Not approved");
        req.status = RequestStatus.Revoked;
        activeAccess[req.datasetId][req.researcher] = false;
        genomeRegistry.addAuditLog("revokeAccess", msg.sender, req.datasetId, "");
        emit AccessRevoked(_requestId);
    }

    function hasActiveAccess(bytes32 _datasetId, address _researcher) external view returns (bool) {
        return activeAccess[_datasetId][_researcher];
    }

    function getRequest(bytes32 _requestId) external view returns (AccessRequest memory) {
        return requests[_requestId];
    }

    function getResearcherRequests(address _researcher) external view returns (bytes32[] memory) {
        return researcherRequests[_researcher];
    }

    function getDatasetRequests(bytes32 _datasetId) external view returns (bytes32[] memory) {
        return datasetRequests[_datasetId];
    }
}
