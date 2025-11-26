// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title PrizeloopLottery
 * @notice A provably-fair lottery system using USDC payments and Chainlink VRF
 * @dev Built for Base L2 network with USDC as the payment token
 * 
 * Key Features:
 * - USDC-based ticket purchases (6 decimals)
 * - Provably fair randomness via Chainlink VRF
 * - Multiple prize tiers (1st, 2nd, 3rd place)
 * - Emergency pause and refund mechanisms
 * - Pull payment pattern for security
 */
contract PrizeloopLottery is Ownable, ReentrancyGuard, Pausable, VRFConsumerBaseV2 {
    using SafeERC20 for IERC20;
    
    // ============ Type Declarations ============
    
    enum RoundStatus {
        Active,      // Accepting ticket purchases
        Drawing,     // Random number requested, awaiting VRF response
        Closed,      // Winner selected, prizes claimable
        Cancelled    // Emergency cancelled, refunds available
    }
    
    struct LotteryRound {
        uint256 roundId;
        uint256 ticketPrice;        // In USDC (6 decimals)
        uint256 startTime;
        uint256 endTime;
        uint256 totalTickets;
        uint256 prizePool;          // Total USDC collected
        RoundStatus status;
        uint256 vrfRequestId;
        uint256 randomNumber;
    }
    
    struct Ticket {
        uint256 ticketId;
        uint256 roundId;
        address owner;
        uint256 purchaseTime;
    }
    
    // ============ State Variables ============
    
    // USDC token contract
    IERC20 public immutable usdc;
    
    // Lottery rounds
    uint256 public currentRoundId;
    mapping(uint256 => LotteryRound) public rounds;
    
    // Tickets: roundId => ticketId => Ticket
    mapping(uint256 => mapping(uint256 => Ticket)) public tickets;
    
    // User participation: roundId => user => hasTicket
    mapping(uint256 => mapping(address => bool)) public hasTicket;
    
    // Prize claims: roundId => user => claimableAmount
    mapping(uint256 => mapping(address => uint256)) public prizes;
    
    // Winners: roundId => position => winner address
    mapping(uint256 => mapping(uint256 => address)) public winners;
    
    // Prize distribution (basis points, 10000 = 100%)
    uint256 public firstPlaceBps = 7000;   // 70%
    uint256 public secondPlaceBps = 2000;  // 20%
    uint256 public thirdPlaceBps = 500;    // 5%
    uint256 public protocolFeeBps = 500;   // 5%
    
    // Chainlink VRF Configuration
    VRFCoordinatorV2Interface public immutable vrfCoordinator;
    uint64 public subscriptionId;
    bytes32 public keyHash;
    uint32 public callbackGasLimit = 500000;
    uint16 public requestConfirmations = 3;
    uint32 public constant NUM_WORDS = 1;
    
    // VRF request mapping
    mapping(uint256 => uint256) public vrfRequestToRound;
    
    // Protocol fee collection (in USDC)
    uint256 public collectedFees;
    
    // Minimum number of tickets required to draw
    uint256 public minTicketsForDraw = 3;
    
    // ============ Events ============
    
    event RoundCreated(
        uint256 indexed roundId,
        uint256 ticketPrice,
        uint256 startTime,
        uint256 endTime
    );
    
    event TicketPurchased(
        uint256 indexed roundId,
        address indexed buyer,
        uint256 ticketId,
        uint256 price
    );
    
    event DrawingStarted(
        uint256 indexed roundId,
        uint256 vrfRequestId
    );
    
    event WinnersSelected(
        uint256 indexed roundId,
        address indexed firstPlace,
        address indexed secondPlace,
        address thirdPlace,
        uint256 firstPrize,
        uint256 secondPrize,
        uint256 thirdPrize
    );
    
    event PrizeClaimed(
        uint256 indexed roundId,
        address indexed winner,
        uint256 amount
    );
    
    event RoundCancelled(uint256 indexed roundId);
    
    event RefundIssued(
        uint256 indexed roundId,
        address indexed user,
        uint256 amount
    );
    
    event PrizeDistributionUpdated(
        uint256 first,
        uint256 second,
        uint256 third,
        uint256 protocol
    );
    
    event FeesWithdrawn(address indexed recipient, uint256 amount);
    
    // ============ Errors ============
    
    error RoundNotActive();
    error RoundNotEnded();
    error RoundAlreadyDrawn();
    error AlreadyHasTicket();
    error IncorrectTicketPrice();
    error InsufficientTickets();
    error RoundNotClosed();
    error NoPrizeToClaim();
    error VRFRequestFailed();
    error InvalidPrizeDistribution();
    error ZeroAddress();
    error InsufficientAllowance();
    error TransferFailed();
    error RoundNotCancellable();
    error NoTicketInRound();
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize the lottery contract
     * @param _usdcAddress USDC token address on Base network
     * @param _vrfCoordinator Chainlink VRF Coordinator address
     * @param _subscriptionId Chainlink VRF subscription ID
     * @param _keyHash Gas lane key hash for VRF
     */
    constructor(
        address _usdcAddress,
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        if (_usdcAddress == address(0)) revert ZeroAddress();
        if (_vrfCoordinator == address(0)) revert ZeroAddress();
        
        usdc = IERC20(_usdcAddress);
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Create a new lottery round
     * @param _ticketPrice Price per ticket in USDC (with 6 decimals)
     * @param _duration Duration of the lottery in seconds
     * 
     * Example: _ticketPrice = 5_000000 = 5 USDC
     */
    function createRound(
        uint256 _ticketPrice,
        uint256 _duration
    ) external onlyOwner {
        require(_ticketPrice > 0, "Invalid ticket price");
        require(_duration > 0, "Invalid duration");
        
        currentRoundId++;
        
        rounds[currentRoundId] = LotteryRound({
            roundId: currentRoundId,
            ticketPrice: _ticketPrice,
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            totalTickets: 0,
            prizePool: 0,
            status: RoundStatus.Active,
            vrfRequestId: 0,
            randomNumber: 0
        });
        
        emit RoundCreated(
            currentRoundId,
            _ticketPrice,
            block.timestamp,
            block.timestamp + _duration
        );
    }
    
    /**
     * @notice Purchase a lottery ticket with USDC
     * @dev User must first approve this contract to spend USDC
     * 
     * Frontend flow:
     * 1. user calls: usdc.approve(lotteryAddress, ticketPrice)
     * 2. user calls: lottery.buyTicket()
     */
    function buyTicket() external whenNotPaused nonReentrant {
        LotteryRound storage round = rounds[currentRoundId];
        
        if (round.status != RoundStatus.Active) revert RoundNotActive();
        if (block.timestamp > round.endTime) revert RoundNotActive();
        if (hasTicket[currentRoundId][msg.sender]) revert AlreadyHasTicket();
        
        uint256 ticketPrice = round.ticketPrice;
        
        // Check user has approved sufficient USDC
        uint256 allowance = usdc.allowance(msg.sender, address(this));
        if (allowance < ticketPrice) revert InsufficientAllowance();
        
        // Transfer USDC from user to contract
        usdc.safeTransferFrom(msg.sender, address(this), ticketPrice);
        
        // Create ticket
        uint256 ticketId = round.totalTickets;
        tickets[currentRoundId][ticketId] = Ticket({
            ticketId: ticketId,
            roundId: currentRoundId,
            owner: msg.sender,
            purchaseTime: block.timestamp
        });
        
        hasTicket[currentRoundId][msg.sender] = true;
        round.totalTickets++;
        round.prizePool += ticketPrice;
        
        emit TicketPurchased(currentRoundId, msg.sender, ticketId, ticketPrice);
    }
    
    /**
     * @notice Start the drawing process using Chainlink VRF
     * @dev Can only be called after round ends and min tickets sold
     */
    function drawWinner() external onlyOwner {
        LotteryRound storage round = rounds[currentRoundId];
        
        if (round.status != RoundStatus.Active) revert RoundAlreadyDrawn();
        if (block.timestamp < round.endTime) revert RoundNotEnded();
        if (round.totalTickets < minTicketsForDraw) revert InsufficientTickets();
        
        // Request random number from Chainlink VRF
        uint256 requestId = vrfCoordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            NUM_WORDS
        );
        
        if (requestId == 0) revert VRFRequestFailed();
        
        round.status = RoundStatus.Drawing;
        round.vrfRequestId = requestId;
        vrfRequestToRound[requestId] = currentRoundId;
        
        emit DrawingStarted(currentRoundId, requestId);
    }
    
    /**
     * @notice Chainlink VRF callback - receives random number
     * @dev Called automatically by VRF Coordinator
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 roundId = vrfRequestToRound[requestId];
        LotteryRound storage round = rounds[roundId];
        
        require(round.status == RoundStatus.Drawing, "Invalid status");
        
        round.randomNumber = randomWords[0];
        round.status = RoundStatus.Closed;
        
        _selectWinners(roundId, randomWords[0]);
    }
    
    /**
     * @notice Internal function to select winners and allocate prizes
     */
    function _selectWinners(uint256 roundId, uint256 randomNumber) internal {
        LotteryRound storage round = rounds[roundId];
        uint256 totalTickets = round.totalTickets;
        
        if (totalTickets == 0) return;
        
        // Select first place
        uint256 firstIndex = randomNumber % totalTickets;
        address firstPlace = tickets[roundId][firstIndex].owner;
        winners[roundId][0] = firstPlace;
        
        // Select second place (if enough tickets)
        address secondPlace;
        if (totalTickets > 1) {
            uint256 secondIndex = uint256(keccak256(abi.encode(randomNumber, 1))) % totalTickets;
            while (tickets[roundId][secondIndex].owner == firstPlace) {
                secondIndex = (secondIndex + 1) % totalTickets;
            }
            secondPlace = tickets[roundId][secondIndex].owner;
            winners[roundId][1] = secondPlace;
        }
        
        // Select third place (if enough tickets)
        address thirdPlace;
        if (totalTickets > 2) {
            uint256 thirdIndex = uint256(keccak256(abi.encode(randomNumber, 2))) % totalTickets;
            while (
                tickets[roundId][thirdIndex].owner == firstPlace ||
                tickets[roundId][thirdIndex].owner == secondPlace
            ) {
                thirdIndex = (thirdIndex + 1) % totalTickets;
            }
            thirdPlace = tickets[roundId][thirdIndex].owner;
            winners[roundId][2] = thirdPlace;
        }
        
        // Calculate prizes in USDC
        uint256 prizePool = round.prizePool;
        uint256 protocolFee = (prizePool * protocolFeeBps) / 10000;
        uint256 remainingPool = prizePool - protocolFee;
        
        uint256 firstPrize = (remainingPool * firstPlaceBps) / 10000;
        uint256 secondPrize = 0;
        uint256 thirdPrize = 0;
        
        prizes[roundId][firstPlace] = firstPrize;
        
        if (secondPlace != address(0)) {
            secondPrize = (remainingPool * secondPlaceBps) / 10000;
            prizes[roundId][secondPlace] = secondPrize;
        }
        
        if (thirdPlace != address(0)) {
            thirdPrize = (remainingPool * thirdPlaceBps) / 10000;
            prizes[roundId][thirdPlace] = thirdPrize;
        }
        
        collectedFees += protocolFee;
        
        emit WinnersSelected(
            roundId,
            firstPlace,
            secondPlace,
            thirdPlace,
            firstPrize,
            secondPrize,
            thirdPrize
        );
    }
    
    /**
     * @notice Claim prize in USDC for a specific round
     * @param roundId The lottery round ID
     */
    function claimPrize(uint256 roundId) external nonReentrant {
        if (rounds[roundId].status != RoundStatus.Closed) revert RoundNotClosed();
        
        uint256 prize = prizes[roundId][msg.sender];
        if (prize == 0) revert NoPrizeToClaim();
        
        // Effects before interaction
        prizes[roundId][msg.sender] = 0;
        
        // Transfer USDC to winner
        usdc.safeTransfer(msg.sender, prize);
        
        emit PrizeClaimed(roundId, msg.sender, prize);
    }
    
    /**
     * @notice Cancel a round (emergency only)
     * @param roundId The lottery round ID
     */
    function cancelRound(uint256 roundId) external onlyOwner {
        LotteryRound storage round = rounds[roundId];
        
        if (
            round.status != RoundStatus.Active &&
            round.status != RoundStatus.Drawing
        ) revert RoundNotCancellable();
        
        round.status = RoundStatus.Cancelled;
        
        emit RoundCancelled(roundId);
    }
    
    /**
     * @notice Claim USDC refund for cancelled round
     * @param roundId The lottery round ID
     */
    function claimRefund(uint256 roundId) external nonReentrant {
        LotteryRound storage round = rounds[roundId];
        
        require(round.status == RoundStatus.Cancelled, "Not cancelled");
        if (!hasTicket[roundId][msg.sender]) revert NoTicketInRound();
        
        hasTicket[roundId][msg.sender] = false;
        uint256 refundAmount = round.ticketPrice;
        
        // Transfer USDC refund
        usdc.safeTransfer(msg.sender, refundAmount);
        
        emit RefundIssued(roundId, msg.sender, refundAmount);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update prize distribution percentages
     */
    function updatePrizeDistribution(
        uint256 _first,
        uint256 _second,
        uint256 _third,
        uint256 _protocol
    ) external onlyOwner {
        if (_first + _second + _third + _protocol != 10000) {
            revert InvalidPrizeDistribution();
        }
        
        firstPlaceBps = _first;
        secondPlaceBps = _second;
        thirdPlaceBps = _third;
        protocolFeeBps = _protocol;
        
        emit PrizeDistributionUpdated(_first, _second, _third, _protocol);
    }
    
    /**
     * @notice Update minimum tickets required for draw
     */
    function updateMinTickets(uint256 _minTickets) external onlyOwner {
        require(_minTickets >= 1, "Must be at least 1");
        minTicketsForDraw = _minTickets;
    }
    
    /**
     * @notice Withdraw collected protocol fees in USDC
     */
    function withdrawFees(address recipient) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        
        uint256 amount = collectedFees;
        require(amount > 0, "No fees to withdraw");
        
        collectedFees = 0;
        usdc.safeTransfer(recipient, amount);
        
        emit FeesWithdrawn(recipient, amount);
    }
    
    /**
     * @notice Update VRF configuration
     */
    function updateVRFConfig(
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit
    ) external onlyOwner {
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
    }
    
    /**
     * @notice Pause contract (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get current round details
     */
    function getCurrentRound() external view returns (LotteryRound memory) {
        return rounds[currentRoundId];
    }
    
    /**
     * @notice Get round details by ID
     */
    function getRound(uint256 roundId) external view returns (LotteryRound memory) {
        return rounds[roundId];
    }
    
    /**
     * @notice Check if user has ticket in round
     */
    function userHasTicket(uint256 roundId, address user) external view returns (bool) {
        return hasTicket[roundId][user];
    }
    
    /**
     * @notice Get winners for a round
     */
    function getRoundWinners(uint256 roundId) external view returns (
        address first,
        address second,
        address third
    ) {
        return (
            winners[roundId][0],
            winners[roundId][1],
            winners[roundId][2]
        );
    }
    
    /**
     * @notice Get claimable prize for user in round
     */
    function getClaimablePrize(uint256 roundId, address user) 
        external 
        view 
        returns (uint256) 
    {
        return prizes[roundId][user];
    }
    
    /**
     * @notice Get total participants in a round
     */
    function getTotalParticipants(uint256 roundId) external view returns (uint256) {
        return rounds[roundId].totalTickets;
    }
    
    /**
     * @notice Get contract USDC balance
     */
    function getContractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
