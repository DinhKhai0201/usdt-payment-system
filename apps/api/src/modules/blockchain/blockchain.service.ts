import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import { DatabaseService } from "../database/database.service";
import { PaymentsService } from "../payments/payments.service";

const MOCK_USDT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

@Injectable()
export class BlockchainWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainWatcherService.name);
  private provider!: ethers.JsonRpcProvider;
  private contract!: ethers.Contract;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly paymentsService: PaymentsService
  ) {}

  async onModuleInit() {
    this.logger.log("Initializing Blockchain Watcher on http://127.0.0.1:8545");
    this.provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    this.contract = new ethers.Contract(MOCK_USDT_ADDRESS, ERC20_ABI, this.provider);

    this.contract.on("Transfer", (from, to, value, event) => {
      this.handleTransferEvent(from, to, value, event).catch((err) => {
        this.logger.error("Failed to handle Transfer event", err);
      });
    });
  }

  async handleTransferEvent(from: string, to: string, value: bigint, event: any) {
    this.logger.log(`Detected Transfer: ${from} -> ${to} | Value: ${value.toString()}`);

    // Check if the recipient matches any assigned deposit address in our system
    const depositRecord = this.databaseService.findDepositAddressByAddress(to);
    
    if (depositRecord && depositRecord.invoiceId && depositRecord.status === "ASSIGNED") {
      this.logger.log(`Matched Deposit Address! Processing payment for Invoice ${depositRecord.invoiceId}`);
      
      const invoice = this.databaseService.findInvoice(depositRecord.invoiceId);
      if (!invoice) return;

      const amountCents = Number(value); // Assuming MockUSDT decimals match amountCents natively for simplicity, or we do conversion.
      // Wait, amountCents in db is 500 for $5.00. MockUSDT has 6 decimals. 
      // 500 cents = $5.00 = 5 * 10^6 = 5,000,000. So amountCents = value / 10000.
      const detectedAmountCents = Number(value / 10000n);
      const txHash = event.log?.transactionHash ?? "0xunknown";

      this.logger.log(`Detected Amount Cents: ${detectedAmountCents} (Expected: ${invoice.amountCents})`);
      
      if (detectedAmountCents >= invoice.amountCents) {
        // Trigger payment success logic
        await this.paymentsService.simulatePayment(invoice.id, from, detectedAmountCents, txHash);
      }
    }
  }

  onModuleDestroy() {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }
}
