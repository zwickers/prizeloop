const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");

describe("PrizeloopLottery", function () {
  // Fixture to deploy contracts
  async function deployLotteryFixture() {
    const [owner, player1, player2, player3, player4] =
      await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6); // 6 decimals like real USDC
    await usdc.deployed();

    // Deploy mock VRF Coordinator
    const MockVRFCoordinator = await ethers.getContractFactory(
      "MockVRFCoordinatorV2"
    );
    const vrfCoordinator = await MockVRFCoordinator.deploy();
    await vrfCoordinator.deployed();

    // Create VRF subscription
    const createSubTx = await vrfCoordinator.createSubscription();
    const createSubReceipt = await createSubTx.wait();
    const subscriptionId = createSubReceipt.events[0].args.subId;

    // Fund subscription with LINK (mock)
    await vrfCoordinator.fundSubscription(
      subscriptionId,
      ethers.utils.parseEther("10")
    );

    // Deploy lottery contract
    const keyHash =
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
    const PrizeloopLottery = await ethers.getContractFactory(
      "PrizeloopLottery"
    );
    const lottery = await PrizeloopLottery.deploy(
      usdc.address,
      vrfCoordinator.address,
      subscriptionId,
      keyHash
    );
    await lottery.deployed();

    // Add lottery as consumer
    await vrfCoordinator.addConsumer(subscriptionId, lottery.address);

    // Mint USDC to players
    const usdcAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(player1.address, usdcAmount);
    await usdc.mint(player2.address, usdcAmount);
    await usdc.mint(player3.address, usdcAmount);
    await usdc.mint(player4.address, usdcAmount);

    return {
      lottery,
      usdc,
      vrfCoordinator,
      owner,
      player1,
      player2,
      player3,
      player4,
      subscriptionId,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);
      expect(await lottery.owner()).to.equal(owner.address);
    });

    it("Should set the correct USDC address", async function () {
      const { lottery, usdc } = await loadFixture(deployLotteryFixture);
      expect(await lottery.usdc()).to.equal(usdc.address);
    });

    it("Should start with round ID 0", async function () {
      const { lottery } = await loadFixture(deployLotteryFixture);
      expect(await lottery.currentRoundId()).to.equal(0);
    });

    it("Should set correct prize distribution", async function () {
      const { lottery } = await loadFixture(deployLotteryFixture);
      expect(await lottery.firstPlaceBps()).to.equal(7000);
      expect(await lottery.secondPlaceBps()).to.equal(2000);
      expect(await lottery.thirdPlaceBps()).to.equal(500);
      expect(await lottery.protocolFeeBps()).to.equal(500);
    });
  });

  describe("Round Creation", function () {
    it("Should create a new round", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);

      const ticketPrice = ethers.utils.parseUnits("5", 6); // 5 USDC
      const duration = 86400; // 24 hours

      await expect(
        lottery.connect(owner).createRound(ticketPrice, duration)
      ).to.emit(lottery, "RoundCreated");

      const round = await lottery.getCurrentRound();
      expect(round.roundId).to.equal(1);
      expect(round.ticketPrice).to.equal(ticketPrice);
      expect(round.totalTickets).to.equal(0);
      expect(round.status).to.equal(0); // Active
    });

    it("Should only allow owner to create rounds", async function () {
      const { lottery, player1 } = await loadFixture(deployLotteryFixture);

      const ticketPrice = ethers.utils.parseUnits("5", 6);
      const duration = 86400;

      await expect(
        lottery.connect(player1).createRound(ticketPrice, duration)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should increment round ID", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);

      const ticketPrice = ethers.utils.parseUnits("5", 6);
      const duration = 86400;

      await lottery.connect(owner).createRound(ticketPrice, duration);
      expect(await lottery.currentRoundId()).to.equal(1);

      await lottery.connect(owner).createRound(ticketPrice, duration);
      expect(await lottery.currentRoundId()).to.equal(2);
    });
  });

  describe("Ticket Purchase", function () {
    it("Should allow user to buy ticket with USDC", async function () {
      const { lottery, usdc, owner, player1 } = await loadFixture(
        deployLotteryFixture
      );

      const ticketPrice = ethers.utils.parseUnits("5", 6); // 5 USDC
      const duration = 86400;

      await lottery.connect(owner).createRound(ticketPrice, duration);

      // Approve USDC spending
      await usdc.connect(player1).approve(lottery.address, ticketPrice);

      // Buy ticket
      await expect(lottery.connect(player1).buyTicket())
        .to.emit(lottery, "TicketPurchased")
        .withArgs(1, player1.address, 0, ticketPrice);

      const round = await lottery.getCurrentRound();
      expect(round.totalTickets).to.equal(1);
      expect(round.prizePool).to.equal(ticketPrice);

      const hasTicket = await lottery.userHasTicket(1, player1.address);
      expect(hasTicket).to.be.true;
    });

    it("Should not allow buying ticket without approval", async function () {
      const { lottery, owner, player1 } = await loadFixture(
        deployLotteryFixture
      );

      const ticketPrice = ethers.utils.parseUnits("5", 6);
      const duration = 86400;

      await lottery.connect(owner).createRound(ticketPrice, duration);

      await expect(
        lottery.connect(player1).buyTicket()
      ).to.be.revertedWithCustomError(lottery, "InsufficientAllowance");
    });

    it("Should not allow buying multiple tickets in same round", async function () {
      const { lottery, usdc, owner, player1 } = await loadFixture(
        deployLotteryFixture
      );

      const ticketPrice = ethers.utils.parseUnits("5", 6);
      const duration = 86400;

      await lottery.connect(owner).createRound(ticketPrice, duration);
      await usdc.connect(player1).approve(lottery.address, ticketPrice.mul(2));

      await lottery.connect(player1).buyTicket();

      await expect(
        lottery.connect(player1).buyTicket()
      ).to.be.revertedWithCustomError(lottery, "AlreadyHasTicket");
    });

    it("Should transfer USDC to contract", async function () {
      const { lottery, usdc, owner, player1 } = await loadFixture(
        deployLotteryFixture
      );

      const ticketPrice = ethers.utils.parseUnits("5", 6);
      const duration = 86400;

      await lottery.connect(owner).createRound(ticketPrice, duration);

      const balanceBefore = await usdc.balanceOf(lottery.address);
      await usdc.connect(player1).approve(lottery.address, ticketPrice);
      await lottery.connect(player1).buyTicket();
      const balanceAfter = await usdc.balanceOf(lottery.address);

      expect(balanceAfter.sub(balanceBefore)).to.equal(ticketPrice);
    });

    it("Should not allow buying after round ends", async function () {
      const { lottery, usdc, owner, player1 } = await loadFixture(
        deployLotteryFixture
      );

      const ticketPrice = ethers.utils.parseUnits("5", 6);
      const duration = 3600; // 1 hour

      await lottery.connect(owner).createRound(ticketPrice, duration);

      // Fast forward past end time
      await time.increase(3601);

      await usdc.connect(player1).approve(lottery.address, ticketPrice);

      await expect(
        lottery.connect(player1).buyTicket()
      ).to.be.revertedWithCustomError(lottery, "RoundNotActive");
    });
  });

  describe("Drawing Winner", function () {
    it("Should request randomness from VRF", async function () {
      const { lottery, usdc, owner, player1, player2, player3 } =
        await loadFixture(deployLotteryFixture);

      const ticketPrice = ethers.utils.parseUnits("5", 6);
      const duration = 3600;

      await lottery.connect(owner).createRound(ticketPrice, duration);

      // Buy tickets
      await usdc.connect(player1).approve(lottery.address, ticketPrice);
      await lottery.connect(player1).buyTicket();

      await usdc.connect(player2).approve(lottery.address, ticketPrice);
      await lottery.connect(player2).buyTicket();

      await usdc.connect(player3).approve(lottery.address, ticketPrice);
      await lottery.connect(player3).buyTicket();

      // Fast forward
      await time.increase(3601);

      await expect(lottery.connect(owner).drawWinner()).to.emit(
        lottery,
        "DrawingStarted"
      );

      const round = await lottery.getCurrentRound();
      expect(round.status).to.equal(1); // Drawing
    });

    it("Should not allow drawing before round ends", async function () {
      const { lottery, usdc, owner, player1, player2, player3 } =
        await loadFixture(deployLotteryFixture);

      const ticketPrice = ethers.utils.parseUnits("5", 6);
      const duration = 3600;

      await lottery.connect(owner).createRound(ticketPrice, duration);

      await usdc.connect(player1).approve(lottery.address, ticketPrice);
      await lottery.connect(player1).buyTicket();

      await usdc.connect(player2).approve(lottery.address, ticketPrice);
      await lottery.connect(player2).buyTicket();

      await usdc.connect(player3).approve(lottery.address, ticketPrice);
      await lottery.connect(player3).buyTicket();

      await expect(
        lottery.connect(owner).drawWinner()
      ).to.be.revertedWithCustomError(lottery, "RoundNotEnded");
    });

    it("Should not allow drawing with insufficient tickets", async function () {
      const { lottery, usdc, owner, player1 } = await loadFixture(
        deployLotteryFixture
      );

      const ticketPrice = ethers.utils.parseUnits("5", 6);
      const duration = 3600;

      await lottery.connect(owner).createRound(ticketPrice, duration);

      await usdc.connect(player1).approve(lottery.address, ticketPrice);
      await lottery.connect(player1).buyTicket();

      await time.increase(3601);

      await expect(
        lottery.connect(owner).drawWinner()
      ).to.be.revertedWithCustomError(lottery, "InsufficientTickets");
    });
  });

  describe("Winner Selection & Prize Claim", function () {
    it("Should select winners and distribute prizes", async function () {
      const {
        lottery,
        usdc,
        vrfCoordinator,
        owner,
        player1,
        player2,
        player3,
      } = await loadFixture(deployLotteryFixture);

      const ticketPrice = ethers.utils.parseUnits("10", 6); // 10 USDC
      const duration = 3600;

      await lottery.connect(owner).createRound(ticketPrice, duration);

      // Buy tickets
      await usdc.connect(player1).approve(lottery.address, ticketPrice);
      await lottery.connect(player1).buyTicket();

      await usdc.connect(player2).approve(lottery.address, ticketPrice);
      await lottery.connect(player2).buyTicket();

      await usdc.connect(player3).approve(lottery.address, ticketPrice);
      await lottery.connect(player3).buyTicket();

      await time.increase(3601);

      const drawTx = await lottery.connect(owner).drawWinner();
      const drawReceipt = await drawTx.wait();
      const requestId = drawReceipt.events.find(
        (e) => e.event === "DrawingStarted"
      ).args.vrfRequestId;

      // Fulfill random words (mock VRF response)
      await expect(
        vrfCoordinator.fulfillRandomWords(requestId, lottery.address)
      ).to.emit(lottery, "WinnersSelected");

      const round = await lottery.getCurrentRound();
      expect(round.status).to.equal(2); // Closed

      // Check winners
      const winners = await lottery.getRoundWinners(1);
      expect(winners.first).to.not.equal(ethers.constants.AddressZero);
      expect(winners.second).to.not.equal(ethers.constants.AddressZero);
      expect(winners.third).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should allow winner to claim prize", async function () {
      const {
        lottery,
        usdc,
        vrfCoordinator,
        owner,
        player1,
        player2,
        player3,
      } = await loadFixture(deployLotteryFixture);

      const ticketPrice = ethers.utils.parseUnits("10", 6);
      const duration = 3600;

      await lottery.connect(owner).createRound(ticketPrice, duration);

      await usdc.connect(player1).approve(lottery.address, ticketPrice);
      await lottery.connect(player1).buyTicket();

      await usdc.connect(player2).approve(lottery.address, ticketPrice);
      await lottery.connect(player2).buyTicket();

      await usdc.connect(player3).approve(lottery.address, ticketPrice);
      await lottery.connect(player3).buyTicket();

      await time.increase(3601);

      const drawTx = await lottery.connect(owner).drawWinner();
      const drawReceipt = await drawTx.wait();
      const requestId = drawReceipt.events.find(
        (e) => e.event === "DrawingStarted"
      ).args.vrfRequestId;

      await vrfCoordinator.fulfillRandomWords(requestId, lottery.address);

      const winners = await lottery.getRoundWinners(1);
      const firstWinner = winners.first;

      // Find the signer for the first winner
      const winnerSigner = [player1, player2, player3].find(
        (p) => p.address === firstWinner
      );

      const prize = await lottery.getClaimablePrize(1, firstWinner);
      expect(prize).to.be.gt(0);

      const balanceBefore = await usdc.balanceOf(firstWinner);
      await lottery.connect(winnerSigner).claimPrize(1);
      const balanceAfter = await usdc.balanceOf(firstWinner);

      expect(balanceAfter.sub(balanceBefore)).to.equal(prize);
    });
  });

  describe("Emergency Controls", function () {
    it("Should allow owner to pause contract", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);

      await lottery.connect(owner).pause();
      expect(await lottery.paused()).to.be.true;
    });

    it("Should not allow buying tickets when paused", async function () {
      const { lottery, usdc, owner, player1 } = await loadFixture(
        deployLotteryFixture
      );

      const ticketPrice = ethers.utils.parseUnits("5", 6);
      const duration = 3600;

      await lottery.connect(owner).createRound(ticketPrice, duration);
      await lottery.connect(owner).pause();

      await usdc.connect(player1).approve(lottery.address, ticketPrice);

      await expect(lottery.connect(player1).buyTicket()).to.be.revertedWith(
        "Pausable: paused"
      );
    });

    it("Should allow owner to cancel round", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);

      const ticketPrice = ethers.utils.parseUnits("5", 6);
      const duration = 3600;

      await lottery.connect(owner).createRound(ticketPrice, duration);

      await expect(lottery.connect(owner).cancelRound(1)).to.emit(
        lottery,
        "RoundCancelled"
      );

      const round = await lottery.getRound(1);
      expect(round.status).to.equal(3); // Cancelled
    });

    it("Should allow refund for cancelled round", async function () {
      const { lottery, usdc, owner, player1 } = await loadFixture(
        deployLotteryFixture
      );

      const ticketPrice = ethers.utils.parseUnits("5", 6);
      const duration = 3600;

      await lottery.connect(owner).createRound(ticketPrice, duration);

      await usdc.connect(player1).approve(lottery.address, ticketPrice);
      await lottery.connect(player1).buyTicket();

      await lottery.connect(owner).cancelRound(1);

      const balanceBefore = await usdc.balanceOf(player1.address);
      await lottery.connect(player1).claimRefund(1);
      const balanceAfter = await usdc.balanceOf(player1.address);

      expect(balanceAfter.sub(balanceBefore)).to.equal(ticketPrice);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update prize distribution", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);

      await lottery
        .connect(owner)
        .updatePrizeDistribution(6000, 2500, 1000, 500);

      expect(await lottery.firstPlaceBps()).to.equal(6000);
      expect(await lottery.secondPlaceBps()).to.equal(2500);
      expect(await lottery.thirdPlaceBps()).to.equal(1000);
      expect(await lottery.protocolFeeBps()).to.equal(500);
    });

    it("Should revert if prize distribution doesn't sum to 100%", async function () {
      const { lottery, owner } = await loadFixture(deployLotteryFixture);

      await expect(
        lottery.connect(owner).updatePrizeDistribution(6000, 2500, 1000, 1000)
      ).to.be.revertedWithCustomError(lottery, "InvalidPrizeDistribution");
    });

    it("Should allow owner to withdraw fees", async function () {
      const {
        lottery,
        usdc,
        vrfCoordinator,
        owner,
        player1,
        player2,
        player3,
      } = await loadFixture(deployLotteryFixture);

      const ticketPrice = ethers.utils.parseUnits("10", 6);
      const duration = 3600;

      await lottery.connect(owner).createRound(ticketPrice, duration);

      await usdc.connect(player1).approve(lottery.address, ticketPrice);
      await lottery.connect(player1).buyTicket();

      await usdc.connect(player2).approve(lottery.address, ticketPrice);
      await lottery.connect(player2).buyTicket();

      await usdc.connect(player3).approve(lottery.address, ticketPrice);
      await lottery.connect(player3).buyTicket();

      await time.increase(3601);

      const drawTx = await lottery.connect(owner).drawWinner();
      const drawReceipt = await drawTx.wait();
      const requestId = drawReceipt.events.find(
        (e) => e.event === "DrawingStarted"
      ).args.vrfRequestId;

      await vrfCoordinator.fulfillRandomWords(requestId, lottery.address);

      const collectedFees = await lottery.collectedFees();
      expect(collectedFees).to.be.gt(0);

      const balanceBefore = await usdc.balanceOf(owner.address);
      await lottery.connect(owner).withdrawFees(owner.address);
      const balanceAfter = await usdc.balanceOf(owner.address);

      expect(balanceAfter.sub(balanceBefore)).to.equal(collectedFees);
    });
  });
});

// Mock ERC20 contract for testing
const MockERC20Source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private _decimals;
    
    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
`;

// Mock VRF Coordinator for testing
const MockVRFCoordinatorSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockVRFCoordinatorV2 {
    uint64 private nextSubId = 1;
    mapping(uint64 => uint256) public subscriptionBalance;
    mapping(uint64 => address[]) public subscriptionConsumers;
    
    event SubscriptionCreated(uint64 indexed subId, address owner);
    event RandomWordsRequested(uint256 indexed requestId, uint64 indexed subId);
    
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
        bytes32,
        uint64 subId,
        uint16,
        uint32,
        uint32
    ) external returns (uint256) {
        uint256 requestId = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, subId)));
        emit RandomWordsRequested(requestId, subId);
        return requestId;
    }
    
    function fulfillRandomWords(uint256 requestId, address consumer) external {
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = uint256(keccak256(abi.encodePacked(requestId, block.timestamp)));
        
        (bool success,) = consumer.call(
            abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, randomWords)
        );
        require(success, "Callback failed");
    }
}
`;
