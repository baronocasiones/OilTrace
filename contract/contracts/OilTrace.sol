// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OilTrace {
    struct CollectionRecord {
        string  consumerRef;
        uint256 tpmValue;
        uint8   grade;
        uint256 volumeMl;
        uint256 timestamp;
        string  locationHash;
        string  driverRef;
        bytes32 dataIntegrity;
    }

    CollectionRecord[] public records;
    address public immutable owner;
    uint256 public recordCount;

    event CollectionRecorded(
        uint256 indexed id,
        uint256 tpmValue,
        uint8   grade,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "OilTrace: caller is not the owner");
        _;
    }

    modifier validRecord(uint256 _id) {
        require(_id < records.length, "OilTrace: record does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function recordCollection(
        string calldata _consumerRef,
        uint256 _tpmValue,
        uint8   _grade,
        uint256 _volumeMl,
        string calldata _locationHash,
        string calldata _driverRef,
        bytes32 _dataIntegrity
    ) external onlyOwner returns (uint256) {
        require(_grade <= 2, "OilTrace: invalid grade");

        records.push(CollectionRecord({
            consumerRef:   _consumerRef,
            tpmValue:      _tpmValue,
            grade:         _grade,
            volumeMl:      _volumeMl,
            timestamp:     block.timestamp,
            locationHash:  _locationHash,
            driverRef:     _driverRef,
            dataIntegrity: _dataIntegrity
        }));

        uint256 id = records.length - 1;
        recordCount = records.length;

        emit CollectionRecorded(id, _tpmValue, _grade, block.timestamp);
        return id;
    }

    function getRecord(uint256 _id) external view validRecord(_id)
        returns (CollectionRecord memory)
    {
        return records[_id];
    }

    function getRecordCount() external view returns (uint256) {
        return records.length;
    }

    function verifyData(uint256 _id, bytes32 _hash) external view validRecord(_id)
        returns (bool)
    {
        return records[_id].dataIntegrity == _hash;
    }

    function getRecords(uint256[] calldata _ids) external view
        returns (CollectionRecord[] memory)
    {
        CollectionRecord[] memory result = new CollectionRecord[](_ids.length);
        for (uint256 i = 0; i < _ids.length; i++) {
            require(_ids[i] < records.length, "OilTrace: record does not exist");
            result[i] = records[_ids[i]];
        }
        return result;
    }
}
