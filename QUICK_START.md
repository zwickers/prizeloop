# 🚀 Quick Start - Test Your Lottery in 5 Minutes

## Step 1: Open Remix

https://remix.ethereum.org

## Step 2: Create 3 Files

### File 1: `PrizeloopLottery.sol`

Copy from: `contracts/PrizeloopLottery.sol`

### File 2: `MockERC20.sol`

Copy from: `contracts/mocks/MockERC20.sol`

### File 3: `MockVRFCoordinatorV2.sol`

Copy from: `contracts/mocks/MockVRFCoordinatorV2.sol`

## Step 3: Compile

- Compiler version: **0.8.20**
- Click "Compile" for all 3 files

## Step 4: Deploy (in order)

### 1. Deploy MockERC20

```
Constructor:
- name: "USD Coin"
- symbol: "USDC"
- decimals_: 6
```

📋 Copy address: `0x...`

### 2. Deploy MockVRFCoordinatorV2

```
No constructor parameters
```

📋 Copy address: `0x...`

**Call `createSubscription()`** → Get subId from logs

### 3. Deploy PrizeloopLottery

```
Constructor:
- _usdcAddress: <MockERC20 address>
- _vrfCoordinator: <MockVRFCoordinatorV2 address>
- _subscriptionId: <subId from step 2>
- _keyHash: 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c
```

## Step 5: Setup VRF

In MockVRFCoordinatorV2:

```javascript
addConsumer(subId, <PrizeloopLottery address>)
fundSubscription(subId, 10000000000000000000)
```

## Step 6: Test Lottery!

### Create Round:

```javascript
PrizeloopLottery.createRound(5000000, 60);
// 5 USDC ticket, 60 second duration
```

### Mint USDC to 3+ accounts:

```javascript
// Switch account in Remix
MockERC20.mint(<account address>, 1000000000)
// Repeat for 3-4 accounts
```

### Buy Tickets:

```javascript
// For each account:
MockERC20.approve(<lottery address>, 5000000)
PrizeloopLottery.buyTicket()
```

### Draw Winner:

```javascript
PrizeloopLottery.drawWinner()
// Copy vrfRequestId from logs

MockVRFCoordinatorV2.fulfillRandomWords(
  <vrfRequestId>,
  <lottery address>
)
```

### Check Winners:

```javascript
PrizeloopLottery.getRoundWinners(1);
// Returns 3 winners!
```

### Claim Prize:

```javascript
// Switch to winner account
PrizeloopLottery.claimPrize(1)

// Check balance
MockERC20.balanceOf(<winner address>)
// You got USDC! 🎉
```

---

## ✅ You're Done!

You just:

- ✅ Deployed a lottery contract
- ✅ Created a round
- ✅ Sold tickets
- ✅ Selected random winners
- ✅ Distributed USDC prizes

All without installing anything or needing testnet funds!

---

## Next Steps:

1. **Test more features:**

   - Multiple rounds
   - Canceling rounds & refunds
   - Changing prize distribution
   - Pausing the contract

2. **When ready for real deployment:**

   - Get Base Sepolia testnet ETH
   - Create real VRF subscription
   - Deploy to Base Sepolia from Remix
   - Point frontend to deployed contract

3. **Read full guide:**
   - `REMIX_DEPLOYMENT_GUIDE.md` for detailed instructions
   - `CONTRACT_SETUP.md` for production deployment

---

**Need help?** Everything is in `REMIX_DEPLOYMENT_GUIDE.md` 📚
