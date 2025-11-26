/**
 * Frontend integration utilities for Prizeloop Lottery (Ethers v6)
 * Handles USDC approval and lottery interactions
 */

import {
  Contract,
  formatUnits,
  parseUnits,
  BrowserProvider,
  JsonRpcProvider,
  ContractTransactionResponse,
} from "ethers";

// Contract ABIs
export const USDC_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export const LOTTERY_ABI = [
  // Core functions
  "function buyTicket()",
  "function claimPrize(uint256 roundId)",
  "function claimRefund(uint256 roundId)",

  // View functions
  "function getCurrentRound() view returns (tuple(uint256 roundId, uint256 ticketPrice, uint256 startTime, uint256 endTime, uint256 totalTickets, uint256 prizePool, uint8 status, uint256 vrfRequestId, uint256 randomNumber))",
  "function getRound(uint256 roundId) view returns (tuple(uint256 roundId, uint256 ticketPrice, uint256 startTime, uint256 endTime, uint256 totalTickets, uint256 prizePool, uint8 status, uint256 vrfRequestId, uint256 randomNumber))",
  "function userHasTicket(uint256 roundId, address user) view returns (bool)",
  "function getRoundWinners(uint256 roundId) view returns (address first, address second, address third)",
  "function getClaimablePrize(uint256 roundId, address user) view returns (uint256)",
  "function getTotalParticipants(uint256 roundId) view returns (uint256)",
  "function getContractBalance() view returns (uint256)",
  "function currentRoundId() view returns (uint256)",

  // Events
  "event RoundCreated(uint256 indexed roundId, uint256 ticketPrice, uint256 startTime, uint256 endTime)",
  "event TicketPurchased(uint256 indexed roundId, address indexed buyer, uint256 ticketId, uint256 price)",
  "event WinnersSelected(uint256 indexed roundId, address indexed firstPlace, address indexed secondPlace, address thirdPlace, uint256 firstPrize, uint256 secondPrize, uint256 thirdPrize)",
  "event PrizeClaimed(uint256 indexed roundId, address indexed winner, uint256 amount)",
];

// Network configurations
export const NETWORK_CONFIG = {
  baseSepolia: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    lottery: process.env.NEXT_PUBLIC_LOTTERY_ADDRESS_SEPOLIA || "",
  },
  base: {
    chainId: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    lottery: process.env.NEXT_PUBLIC_LOTTERY_ADDRESS || "",
  },
};

export enum RoundStatus {
  Active = 0,
  Drawing = 1,
  Closed = 2,
  Cancelled = 3,
}

export interface LotteryRound {
  roundId: number;
  ticketPrice: bigint;
  startTime: number;
  endTime: number;
  totalTickets: number;
  prizePool: bigint;
  status: RoundStatus;
  vrfRequestId: bigint;
  randomNumber: bigint;
}

export interface Winners {
  first: string;
  second: string;
  third: string;
}

/**
 * Format USDC amount (6 decimals) to readable string
 */
export function formatUSDC(amount: bigint): string {
  return formatUnits(amount, 6);
}

/**
 * Parse USDC amount from string to bigint
 */
export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, 6);
}

/**
 * Get the network configuration
 */
export function getNetworkConfig(chainId: number) {
  if (chainId === 84532) return NETWORK_CONFIG.baseSepolia;
  if (chainId === 8453) return NETWORK_CONFIG.base;
  throw new Error(`Unsupported network: ${chainId}`);
}

/**
 * Check if user has sufficient USDC balance
 */
export async function checkUSDCBalance(
  provider: BrowserProvider | JsonRpcProvider,
  userAddress: string,
  amount: bigint
): Promise<boolean> {
  const network = await provider.getNetwork();
  const config = getNetworkConfig(Number(network.chainId));

  const usdc = new Contract(config.usdc, USDC_ABI, provider);
  const balance = (await usdc.balanceOf(userAddress)) as bigint;

  return balance >= amount;
}

/**
 * Check if user has approved sufficient USDC
 */
export async function checkUSDCAllowance(
  provider: BrowserProvider | JsonRpcProvider,
  userAddress: string,
  amount: bigint
): Promise<boolean> {
  const network = await provider.getNetwork();
  const config = getNetworkConfig(Number(network.chainId));

  const usdc = new Contract(config.usdc, USDC_ABI, provider);
  const allowance = (await usdc.allowance(
    userAddress,
    config.lottery
  )) as bigint;

  return allowance >= amount;
}

/**
 * Approve USDC spending for lottery contract
 */
export async function approveUSDC(
  provider: BrowserProvider,
  amount: bigint
): Promise<ContractTransactionResponse> {
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  const config = getNetworkConfig(Number(network.chainId));

  const usdc = new Contract(config.usdc, USDC_ABI, signer);

  return (await usdc.approve(
    config.lottery,
    amount
  )) as ContractTransactionResponse;
}

/**
 * Get current lottery round information
 */
export async function getCurrentRound(
  provider: BrowserProvider | JsonRpcProvider
): Promise<LotteryRound> {
  const network = await provider.getNetwork();
  const config = getNetworkConfig(Number(network.chainId));

  const lottery = new Contract(config.lottery, LOTTERY_ABI, provider);
  const round = await lottery.getCurrentRound();

  return {
    roundId: Number(round.roundId),
    ticketPrice: round.ticketPrice,
    startTime: Number(round.startTime),
    endTime: Number(round.endTime),
    totalTickets: Number(round.totalTickets),
    prizePool: round.prizePool,
    status: round.status,
    vrfRequestId: round.vrfRequestId,
    randomNumber: round.randomNumber,
  };
}

/**
 * Buy a lottery ticket
 * This function handles both USDC approval and ticket purchase
 */
export async function buyLotteryTicket(
  provider: BrowserProvider,
  onApproving?: () => void,
  onBuying?: () => void
): Promise<{
  approvalTx?: ContractTransactionResponse;
  buyTx: ContractTransactionResponse;
}> {
  const signer = await provider.getSigner();
  const userAddress = await signer.getAddress();
  const network = await provider.getNetwork();
  const config = getNetworkConfig(Number(network.chainId));

  const usdc = new Contract(config.usdc, USDC_ABI, signer);
  const lottery = new Contract(config.lottery, LOTTERY_ABI, signer);

  // Get current round info
  const currentRound = await lottery.getCurrentRound();
  const ticketPrice = currentRound.ticketPrice as bigint;

  // Check balance
  const balance = (await usdc.balanceOf(userAddress)) as bigint;
  if (balance < ticketPrice) {
    throw new Error(
      `Insufficient USDC balance. Required: ${formatUSDC(ticketPrice)} USDC`
    );
  }

  // Check if approval is needed
  const allowance = (await usdc.allowance(
    userAddress,
    config.lottery
  )) as bigint;
  let approvalTx: ContractTransactionResponse | undefined;

  if (allowance < ticketPrice) {
    if (onApproving) onApproving();

    // Approve USDC spending
    approvalTx = (await usdc.approve(
      config.lottery,
      ticketPrice
    )) as ContractTransactionResponse;
    await approvalTx.wait();
  }

  if (onBuying) onBuying();

  // Buy ticket
  const buyTx = (await lottery.buyTicket()) as ContractTransactionResponse;

  return { approvalTx, buyTx };
}

/**
 * Check if user has a ticket in a specific round
 */
export async function userHasTicket(
  provider: BrowserProvider | JsonRpcProvider,
  roundId: number,
  userAddress: string
): Promise<boolean> {
  const network = await provider.getNetwork();
  const config = getNetworkConfig(Number(network.chainId));

  const lottery = new Contract(config.lottery, LOTTERY_ABI, provider);
  return (await lottery.userHasTicket(roundId, userAddress)) as boolean;
}

/**
 * Get winners for a specific round
 */
export async function getRoundWinners(
  provider: BrowserProvider | JsonRpcProvider,
  roundId: number
): Promise<Winners> {
  const network = await provider.getNetwork();
  const config = getNetworkConfig(Number(network.chainId));

  const lottery = new Contract(config.lottery, LOTTERY_ABI, provider);
  const winners = await lottery.getRoundWinners(roundId);

  return {
    first: winners[0] as string,
    second: winners[1] as string,
    third: winners[2] as string,
  };
}

/**
 * Get claimable prize for user in a round
 */
export async function getClaimablePrize(
  provider: BrowserProvider | JsonRpcProvider,
  roundId: number,
  userAddress: string
): Promise<bigint> {
  const network = await provider.getNetwork();
  const config = getNetworkConfig(Number(network.chainId));

  const lottery = new Contract(config.lottery, LOTTERY_ABI, provider);
  return (await lottery.getClaimablePrize(roundId, userAddress)) as bigint;
}

/**
 * Claim prize for a specific round
 */
export async function claimPrize(
  provider: BrowserProvider,
  roundId: number
): Promise<ContractTransactionResponse> {
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  const config = getNetworkConfig(Number(network.chainId));

  const lottery = new Contract(config.lottery, LOTTERY_ABI, signer);
  return (await lottery.claimPrize(roundId)) as ContractTransactionResponse;
}

/**
 * Claim refund for a cancelled round
 */
export async function claimRefund(
  provider: BrowserProvider,
  roundId: number
): Promise<ContractTransactionResponse> {
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  const config = getNetworkConfig(Number(network.chainId));

  const lottery = new Contract(config.lottery, LOTTERY_ABI, signer);
  return (await lottery.claimRefund(roundId)) as ContractTransactionResponse;
}

/**
 * Get user's USDC balance
 */
export async function getUSDCBalance(
  provider: BrowserProvider | JsonRpcProvider,
  userAddress: string
): Promise<bigint> {
  const network = await provider.getNetwork();
  const config = getNetworkConfig(Number(network.chainId));

  const usdc = new Contract(config.usdc, USDC_ABI, provider);
  return (await usdc.balanceOf(userAddress)) as bigint;
}

/**
 * Format time remaining until round ends
 */
export function getTimeRemaining(endTime: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = endTime - now;

  if (remaining <= 0) return "Ended";

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Get round status as string
 */
export function getRoundStatusText(status: RoundStatus): string {
  switch (status) {
    case RoundStatus.Active:
      return "Active";
    case RoundStatus.Drawing:
      return "Drawing";
    case RoundStatus.Closed:
      return "Closed";
    case RoundStatus.Cancelled:
      return "Cancelled";
    default:
      return "Unknown";
  }
}
