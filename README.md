# Thrill Lottery — Next.js + Chakra UI starter

This repo is a starter for a modern online lottery promotional site built with Next.js 13 (app router), React and Chakra UI. It emphasizes fun, accessibility, and simple provably-fair explanations while keeping blockchain mentions subtle.

Features included:
- Next.js 13 app directory scaffold
- Chakra UI-based components and theme
- Example components: Hero, HowItWorks, Tickets, ProvablyFair, NFT giveaway blurb
- Small ethers dependency available for future Base L2 integration

Getting started

1. Install dependencies

```bash
cd /Users/justinzwick/Desktop/my_project
npm install
```

2. Run dev server

```bash
npm run dev
```

Open http://localhost:3000

Notes
- This is a frontend-only starter. Blockchain interactions (e.g., buying tickets on Base L2) are intentionally not implemented here; use the included `ethers` dependency and add safe server-side endpoints or web3 connectors when ready.

Next steps you might want:
- Add wallet connect (e.g., wagmi + RainbowKit) and on-chain ticket purchase contracts
- Add server-side verification / provable randomness hooks
- Add analytics and monitoring
