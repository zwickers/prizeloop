# Deploy Prizeloop Lottery Using Remix IDE (No Installation Required!)

## Why Remix?

- ✅ Works in your browser - no Node.js issues
- ✅ Built-in local blockchain (Remix VM) with unlimited fake ETH
- ✅ Easy to test and debug
- ✅ Can deploy to real networks when ready

---

## Step-by-Step Guide

### **1. Open Remix IDE**

Go to: **https://remix.ethereum.org**

### **2. Create Contract Files**

In Remix's file explorer (left sidebar):

**Create File: `PrizeloopLottery.sol`**

Copy and paste the entire contract from:

```
/Users/josephclark/Downloads/Trevera/Updated Resumes/Coding Projects/prizeloop/prizeloop/contracts/PrizeloopLottery.sol
```

**Create File: `MockERC20.sol`** (for testing USDC)

Copy from:

```
/Users/josephclark/Downloads/Trevera/Updated Resumes/Coding Projects/prizeloop/prizeloop/contracts/mocks/MockERC20.sol
```

**Create File: `MockVRFCoordinatorV2.sol`** (for testing VRF)

Copy from:

```
/Users/josephclark/Downloads/Trevera/Updated Resumes/Coding Projects/prizeloop/prizeloop/contracts/mocks/MockVRFCoordinatorV2.sol
```

### **3. Install Dependencies in Remix**

Remix automatically handles OpenZeppelin and Chainlink imports!

Just make sure your imports at the top of the contract are correct:

```solidity
import "@openzeppelin/contracts/...";
import "@chainlink/contracts/...";
```

Remix will download these automatically.

### **4. Compile Contracts**

1. Click the **"Solidity Compiler"** tab (left sidebar)
2. Set compiler version to **`0.8.20`**
3. Click **"Compile PrizeloopLottery.sol"**
4. Also compile `MockERC20.sol` and `MockVRFCoordinatorV2.sol`

### **5. Deploy to Remix VM (Local Blockchain)**

1. Click the **"Deploy & Run Transactions"** tab
2. Select **Environment: "Remix VM (Shanghai)"**
   - This gives you unlimited fake ETH!
3. You'll see 10 test accounts, each with 100 ETH

### **6. Deploy Mock Contracts First**

**Deploy MockERC20 (USDC):**

1. Select contract: `MockERC20`
2. Constructor parameters:
   - `name`: "USD Coin"
   - `symbol`: "USDC"
   - `decimals_`: 6
3. Click **"Deploy"**
4. **Copy the deployed address** (you'll need this)

**Deploy MockVRFCoordinatorV2:**

1. Select contract: `MockVRFCoordinatorV2`
2. No constructor parameters
3. Click **"Deploy"**
4. **Copy the deployed address**

**Create VRF Subscription:**

1. In deployed `MockVRFCoordinatorV2`, find `createSubscription` function
2. Click it
3. Check the transaction logs for the `subId` (subscription ID)

### **7. Deploy Main Lottery Contract**

1. Select contract: `PrizeloopLottery`
2. Constructor parameters:
   - `_usdcAddress`: (paste MockERC20 address)
   - `_vrfCoordinator`: (paste MockVRFCoordinatorV2 address)
   - `_subscriptionId`: (the subId from step 6)
   - `_keyHash`: `0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c`
3. Click **"Deploy"**

✅ **Contract deployed!**

### **8. Add Contract as VRF Consumer**

In `MockVRFCoordinatorV2`:

1. Find `addConsumer` function
2. Parameters:
   - `subId`: (your subscription ID)
   - `consumer`: (PrizeloopLottery contract address)
3. Click "addConsumer"

### **9. Fund Subscription with Mock LINK**

In `MockVRFCoordinatorV2`:

1. Find `fundSubscription` function
2. Parameters:
   - `subId`: (your subscription ID)
   - `amount`: 10000000000000000000 (10 LINK in wei)
3. Click "fundSubscription"

### **10. Test the Lottery!**

Now you can interact with your lottery:

**Create a Round:**

1. In `PrizeloopLottery`, find `createRound`
2. Parameters:
   - `_ticketPrice`: 5000000 (5 USDC with 6 decimals)
   - `_duration`: 3600 (1 hour in seconds)
3. Click "createRound"

**Mint USDC to Test Accounts:**

1. Switch to different accounts in the "Account" dropdown
2. In `MockERC20`, use `mint` function:
   - `to`: (account address)
   - `amount`: 1000000000 (1000 USDC)
3. Mint to 3-4 different accounts

**Buy Tickets:**

1. Switch to an account with USDC
2. In `MockERC20`, approve lottery:
   - `spender`: (PrizeloopLottery address)
   - `amount`: 5000000 (5 USDC)
3. In `PrizeloopLottery`, call `buyTicket()`
4. Repeat with different accounts (need 3+ tickets)

**Draw Winner:**

1. In `PrizeloopLottery`, call `drawWinner()`
2. This requests random number from VRF

**Fulfill VRF Request:**

1. Check the transaction logs for `DrawingStarted` event
2. Copy the `vrfRequestId`
3. In `MockVRFCoordinatorV2`, call `fulfillRandomWords`:
   - `requestId`: (the VRF request ID)
   - `consumer`: (PrizeloopLottery address)
4. This triggers winner selection!

**Check Winners:**

1. In `PrizeloopLottery`, call `getRoundWinners`:
   - `roundId`: 1
2. See the 3 winners!

**Claim Prizes:**

1. Switch to a winner's account
2. Call `claimPrize`:
   - `roundId`: 1
3. Check USDC balance - you received the prize!

---

## Useful View Functions

**Check current round:**

```
getCurrentRound()
```

**Check if you have a ticket:**

```
userHasTicket(roundId, yourAddress)
```

**Check your claimable prize:**

```
getClaimablePrize(roundId, yourAddress)
```

**Check USDC balance:**

```
MockERC20.balanceOf(yourAddress)
```

---

## Troubleshooting

**"InsufficientAllowance" error:**

- You need to approve USDC before buying ticket
- Call `MockERC20.approve()` first

**"InsufficientTickets" error:**

- Need at least 3 tickets to draw
- Buy more tickets with different accounts

**"Round not ended" error:**

- Wait for the duration to pass (in Remix VM, you can't fast-forward time easily)
- For testing, use shorter durations like 60 seconds

**VRF not working:**

- Make sure contract is added as consumer
- Make sure subscription is funded
- Make sure you call `fulfillRandomWords` manually (in real VRF, this is automatic)

---

## Deploying to Real Network (Later)

Once tested locally, you can switch:

1. **Environment**: Change from "Remix VM" to "Injected Provider - MetaMask"
2. **Network**: Select Base Sepolia in MetaMask
3. **Deploy**: Use real USDC and VRF addresses
4. Follow same steps with real testnet ETH

---

## Real Network Addresses

**Base Sepolia:**

- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- VRF Coordinator: `0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634`
- Key Hash: `0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c`

**Base Mainnet:**

- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- VRF Coordinator: `0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634`
- Key Hash: `0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c`

---

## 🎉 You're Ready!

You now have a fully functional lottery running in Remix! Test all the features:

- ✅ Create rounds
- ✅ Buy tickets
- ✅ Random winner selection
- ✅ Prize distribution
- ✅ USDC payments

No installation, no faucets needed - just pure development! 🚀
