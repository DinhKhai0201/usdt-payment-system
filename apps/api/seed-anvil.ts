import { ethers } from "ethers";
import fs from "fs";
import { config } from "dotenv";

config();

const MockUSDTAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ABI = [
  "function mint(address to, uint256 amount) external"
];

async function seed() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  // Anvil account 0
  const signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  const contract = new ethers.Contract(MockUSDTAddress, ABI, signer);

  const mnemonic = process.env.WALLET_MNEMONIC || "test test test test test test test test test test test junk";
  const node = ethers.HDNodeWallet.fromPhrase(mnemonic);
  
  let nonce = await signer.getNonce();
  for (let i = 1; i <= 5; i++) {
    // Anvil accounts are at m/44'/60'/0'/0/i
    const child = ethers.HDNodeWallet.fromPhrase(mnemonic, "", `m/44'/60'/0'/0/${i}`);
    const amount = 100000000000; // 100,000 USDT (6 decimals)
    console.log(`Minting 100k USDT to Customer Account ${i}: ${child.address} with nonce ${nonce}`);
    const tx = await contract.mint(child.address, amount, { nonce: nonce++ });
    await tx.wait();
  }
  console.log("Seeding complete.");
}

seed().catch(console.error);
