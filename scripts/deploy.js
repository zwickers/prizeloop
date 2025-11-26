const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("==========================================");
  console.log("🚀 Deploying Prizeloop Lottery Contract");
  console.log("==========================================\n");

  console.log("Network:", hre.network.name);
  console.log("Deployer address:", deployer.address);
  console.log(
    "Deployer balance:",
    hre.ethers.utils.formatEther(await deployer.getBalance()),
    "ETH\n"
  );

  // Network-specific addresses
  const network = hre.network.name;
  let usdcAddress, vrfCoordinator, keyHash;

  if (network === "baseSepolia") {
    // Base Sepolia Testnet addresses
    usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    vrfCoordinator = "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634";
    keyHash =
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
    console.log("📍 Using Base Sepolia Testnet");
  } else if (network === "base") {
    // Base Mainnet addresses
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    vrfCoordinator = "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634";
    keyHash =
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
    console.log("📍 Using Base Mainnet");
  } else if (network === "hardhat" || network === "localhost") {
    // For local testing, we'll use mock addresses
    console.log("📍 Using local/hardhat network");
    console.log("⚠️  You'll need to deploy mock USDC and VRF contracts");
    usdcAddress =
      process.env.MOCK_USDC_ADDRESS ||
      "0x0000000000000000000000000000000000000001";
    vrfCoordinator =
      process.env.MOCK_VRF_COORDINATOR ||
      "0x0000000000000000000000000000000000000002";
    keyHash =
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
  } else {
    throw new Error(`❌ Unsupported network: ${network}`);
  }

  // VRF Subscription ID (MUST be created before deployment)
  const subscriptionId = process.env.VRF_SUBSCRIPTION_ID || 0;

  if (
    subscriptionId === 0 &&
    network !== "hardhat" &&
    network !== "localhost"
  ) {
    console.log("\n⚠️  WARNING: VRF_SUBSCRIPTION_ID not set!");
    console.log(
      "Please create a Chainlink VRF subscription and set VRF_SUBSCRIPTION_ID in .env"
    );
    console.log("Visit: https://vrf.chain.link/");
  }

  console.log("\n📋 Deployment Configuration:");
  console.log("├─ USDC Address:", usdcAddress);
  console.log("├─ VRF Coordinator:", vrfCoordinator);
  console.log("├─ VRF Key Hash:", keyHash);
  console.log("└─ VRF Subscription ID:", subscriptionId);

  console.log("\n⏳ Deploying PrizeloopLottery contract...");

  const PrizeloopLottery = await hre.ethers.getContractFactory(
    "PrizeloopLottery"
  );
  const lottery = await PrizeloopLottery.deploy(
    usdcAddress,
    vrfCoordinator,
    subscriptionId,
    keyHash
  );

  await lottery.deployed();

  console.log("\n✅ Contract deployed successfully!");
  console.log("📍 Contract Address:", lottery.address);

  // Save deployment info
  const deploymentInfo = {
    network: network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    contractAddress: lottery.address,
    deployer: deployer.address,
    usdcAddress: usdcAddress,
    vrfCoordinator: vrfCoordinator,
    keyHash: keyHash,
    subscriptionId: subscriptionId,
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
    transactionHash: lottery.deployTransaction.hash,
  };

  const filename = `deployment-${network}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${filename}`);

  // Display next steps
  console.log("\n==========================================");
  console.log("📝 NEXT STEPS");
  console.log("==========================================");

  if (network !== "hardhat" && network !== "localhost") {
    console.log("\n1️⃣  Add contract as VRF consumer:");
    console.log(`   Visit: https://vrf.chain.link/`);
    console.log(`   Add consumer: ${lottery.address}`);

    console.log("\n2️⃣  Fund your VRF subscription with LINK");

    console.log("\n3️⃣  Verify contract on Basescan:");
    console.log(
      `   npx hardhat verify --network ${network} ${lottery.address} "${usdcAddress}" "${vrfCoordinator}" ${subscriptionId} "${keyHash}"`
    );

    console.log("\n4️⃣  Create your first lottery round:");
    console.log(
      `   const lottery = await hre.ethers.getContractAt("PrizeloopLottery", "${lottery.address}");`
    );
    console.log(
      `   await lottery.createRound(5000000, 86400); // 5 USDC, 24 hours`
    );

    console.log("\n5️⃣  Update frontend with contract address:");
    console.log(`   Contract: ${lottery.address}`);
    console.log(`   USDC: ${usdcAddress}`);
  } else {
    console.log("\n✓ Local deployment successful!");
    console.log("✓ Run tests: npx hardhat test");
  }

  console.log("\n==========================================\n");

  return lottery.address;
}

main()
  .then((address) => {
    console.log(`✨ Deployment completed: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
