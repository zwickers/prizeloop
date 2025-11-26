// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockVRFCoordinatorV2
 * @notice Mock Chainlink VRF Coordinator for testing
 */
contract MockVRFCoordinatorV2 {
    uint64 private nextSubId = 1;
    mapping(uint64 => uint256) public subscriptionBalance;
    mapping(uint64 => address[]) public subscriptionConsumers;
    
    event SubscriptionCreated(uint64 indexed subId, address owner);
    event RandomWordsRequested(
        uint256 indexed requestId,
        uint64 indexed subId,
        address indexed consumer
    );
    
    function createSubscription() external returns (uint64) {
        uint64 subId = nextSubId++;
        emit SubscriptionCreated(subId, msg.sender);
        return subId;
    }
    
    function fundSubscription(uint64 subId, uint256 amount) external {
        subscriptionBalance[subId] += amount;
    }
    
    function addConsumer(uint64 subId, address consumer) external {
        subscriptionConsumers[subId].push(consumer);
    }
    
    function requestRandomWords(
        bytes32, // keyHash
        uint64 subId,
        uint16, // requestConfirmations
        uint32, // callbackGasLimit
        uint32  // numWords
    ) external returns (uint256) {
        uint256 requestId = uint256(
            keccak256(abi.encodePacked(block.timestamp, msg.sender, subId))
        );
        emit RandomWordsRequested(requestId, subId, msg.sender);
        return requestId;
    }
    
    function fulfillRandomWords(uint256 requestId, address consumer) external {
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = uint256(
            keccak256(abi.encodePacked(requestId, block.timestamp, block.difficulty))
        );
        
        (bool success, ) = consumer.call(
            abi.encodeWithSignature(
                "rawFulfillRandomWords(uint256,uint256[])",
                requestId,
                randomWords
            )
        );
        require(success, "Callback failed");
    }
}
