# Prizeloop Smart Contract Setup Guide

## Overview

This guide will help you deploy and integrate the Prizeloop lottery smart contract on Base L2.

## Prerequisites

- Node.js v18+ installed
- A wallet with Base Sepolia ETH for testnet deployment
- Basic understanding of smart contracts and Solidity

## Features Implemented

✅ **USDC-based lottery contract** with SafeERC20 integration  
✅ **Chainlink VRF** for provably fair randomness  
✅ **Multi-tier prizes** (1st: 70%, 2nd: 20%, 3rd: 5%, Protocol: 5%)  
✅ **Emergency controls** (pause, cancel, refunds)  
✅ **Deployment scripts** for Base Sepolia & Mainnet  
✅ **Frontend integration utilities** with USDC approval flow  
✅ **Comprehensive test suite** with mock contracts

## Installation

### 1. Install Hardhat Dependencies

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-verify dotenv
npm install @openzeppelin/contracts @chainlink/contracts
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
VRF_SUBSCRIPTION_ID=0  # Will set after creating subscription
```

**⚠️ IMPORTANT**: Never commit your `.env` file with real private keys!

## Chainlink VRF Setup

### 1. Create VRF Subscription

1. Visit [Chainlink VRF](https://vrf.chain.link/)
2. Connect your wallet to Base Sepolia
3. Click "Create Subscription"
4. Copy the Subscription ID
5. Fund it with testnet LINK (get from [Base Sepolia Faucet](https://faucet.quicknode.com/base/sepolia))

### 2. Update Environment

Add your subscription ID to `.env`:

```env
VRF_SUBSCRIPTION_ID=123  # Your actual subscription ID
```

## Deployment

### Deploy to Base Sepolia Testnet

```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network baseSepolia
```

The script will output:

- Contract address
- Deployment info saved to JSON file
- Next steps instructions

### Add Contract as VRF Consumer

After deployment:

1. Go back to [Chainlink VRF](https://vrf.chain.link/)
2. Open your subscription
3. Click "Add Consumer"
4. Paste your deployed contract address
5. Confirm the transaction

### Verify Contract on Basescan

```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> "<USDC_ADDRESS>" "<VRF_COORDINATOR>" <SUBSCRIPTION_ID> "<KEY_HASH>"
```

Example:

```bash
npx hardhat verify --network baseSepolia 0x1234... "0x036CbD53842c5426634e7929541eC2318f3dCF7e" "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634" 123 "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"
```

## Testing

### Run All Tests

```bash
npx hardhat test
```

### Run Specific Test

```bash
npx hardhat test test/PrizeloopLottery.test.js
```

### Test Coverage

```bash
npx hardhat coverage
```

## Contract Interaction

### Create a Lottery Round (Owner Only)

```javascript
const lottery = await ethers.getContractAt(
  "PrizeloopLottery",
  "CONTRACT_ADDRESS"
);

// Create round: 5 USDC ticket, 24 hour duration
await lottery.createRound(
  ethers.parseUnits("5", 6), // 5 USDC (6 decimals)
  86400 // 24 hours in seconds
);
```

### Buy a Ticket (User)

Users need to:

1. Approve USDC spending
2. Buy ticket

```javascript
const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
const lottery = await ethers.getContractAt("PrizeloopLottery", LOTTERY_ADDRESS);

// Step 1: Approve
const ticketPrice = ethers.parseUnits("5", 6);
await usdc.approve(LOTTERY_ADDRESS, ticketPrice);

// Step 2: Buy ticket
await lottery.buyTicket();
```

### Draw Winner (Owner Only)

After round ends:

```bash
await lottery.drawWinner();
```

This triggers Chainlink VRF to generate a random number. Winners are selected automatically when VRF responds.

### Claim Prize (Winner)

```javascript
await lottery.claimPrize(roundId);
```

## Frontend Integration

### Using the Utility Functions

```typescript
import {
  buyLotteryTicket,
  getCurrentRound,
  formatUSDC,
} from "@/lib/lotteryUtils";
import { BrowserProvider } from "ethers";

// Get current round
const provider = new BrowserProvider(window.ethereum);
const round = await getCurrentRound(provider);
console.log(`Ticket Price: ${formatUSDC(round.ticketPrice)} USDC`);

// Buy ticket
const { approvalTx, buyTx } = await buyLotteryTicket(
  provider,
  () => console.log("Approving USDC..."),
  () => console.log("Buying ticket...")
);

await buyTx.wait();
console.log("Ticket purchased!");
```

### Update Frontend Config

After deployment, update your frontend:

```typescript
// In lib/lotteryUtils.ts, update NETWORK_CONFIG
export const NETWORK_CONFIG = {
  baseSepolia: {
    lottery: "0xYOUR_DEPLOYED_CONTRACT_ADDRESS",
    // ... rest of config
  },
};
```

Or use environment variables:

```env
NEXT_PUBLIC_LOTTERY_ADDRESS_SEPOLIA=0xYOUR_CONTRACT_ADDRESS
```

## Network Information

### Base Sepolia Testnet

- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Block Explorer**: https://sepolia.basescan.org
- **USDC Address**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **VRF Coordinator**: `0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634`
- **Get Testnet ETH**: [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)

### Base Mainnet

- **Chain ID**: 8453
- **RPC URL**: https://mainnet.base.org
- **Block Explorer**: https://basescan.org
- **USDC Address**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **VRF Coordinator**: `0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634`

## Contract Architecture

### PrizeloopLottery.sol

Main contract implementing:

- **Ticket Sales**: Users buy tickets with USDC
- **Random Winner Selection**: Chainlink VRF ensures fairness
- **Prize Distribution**: 70% / 20% / 5% split + 5% protocol fee
- **Emergency Controls**: Pause/unpause, cancel rounds, refunds
- **Access Control**: Owner-only admin functions

### Key Functions

| Function        | Access  | Description                        |
| --------------- | ------- | ---------------------------------- |
| `createRound()` | Owner   | Start a new lottery round          |
| `buyTicket()`   | Public  | Purchase a ticket with USDC        |
| `drawWinner()`  | Owner   | Request random number from VRF     |
| `claimPrize()`  | Winners | Claim USDC prize                   |
| `cancelRound()` | Owner   | Emergency cancel (enables refunds) |
| `claimRefund()` | Public  | Get refund for cancelled round     |

## Security Considerations

✅ **ReentrancyGuard**: Prevents reentrancy attacks  
✅ **SafeERC20**: Safe token transfers  
✅ **Pausable**: Emergency stop mechanism  
✅ **Ownable**: Access control for admin functions  
✅ **VRF**: Provably fair randomness (cannot be manipulated)  
✅ **Pull Payments**: Winners withdraw (safer than push)

## Common Issues

### Issue: "Insufficient USDC balance"

**Solution**: Get testnet USDC from a faucet or use the real USDC on mainnet.

### Issue: "InsufficientAllowance"

**Solution**: User must approve USDC spending before buying a ticket.

### Issue: "VRF request failed"

**Solution**:

1. Ensure VRF subscription has LINK tokens
2. Contract must be added as a consumer
3. Check subscription is active

### Issue: "Round not ended"

**Solution**: Wait until the round's `endTime` has passed before calling `drawWinner()`.

## Deployment Checklist

Before mainnet deployment:

- [ ] Full test coverage (aim for >95%)
- [ ] External security audit
- [ ] Test on Base Sepolia extensively
- [ ] Monitor gas costs
- [ ] Set up monitoring/alerts
- [ ] Prepare emergency procedures
- [ ] Document admin procedures
- [ ] Set up multi-sig for owner account (recommended)
- [ ] Test VRF integration thoroughly
- [ ] Verify all prize calculations

## Gas Optimization Tips

1. **Batch Operations**: Create rounds in advance
2. **Storage Optimization**: Minimize storage writes
3. **View Functions**: Use for reading data (no gas)
4. **Event Indexing**: Use indexed events for efficient queries

## Upgrading the Contract

This contract is **not upgradeable** by design for security and trust. If you need to deploy a new version:

1. Deploy new contract
2. Finish all active rounds on old contract
3. Withdraw all funds
4. Update frontend to point to new contract
5. Communicate changes to users

## Support & Resources

- **Hardhat Docs**: https://hardhat.org/docs
- **OpenZeppelin**: https://docs.openzeppelin.com/contracts
- **Chainlink VRF**: https://docs.chain.link/vrf
- **Base Docs**: https://docs.base.org
- **Ethers.js v6**: https://docs.ethers.org/v6/

## License

MIT License - See contract headers for details

---

**🎲 Good luck with your lottery!**
