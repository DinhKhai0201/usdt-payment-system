import { Injectable, NotFoundException, OnModuleInit, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service";
import { ethers } from "ethers";

const MOCK_USDT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ERC20_ABI = ["function transfer(address to, uint256 amount) external returns (bool)"];

@Injectable()
export class WalletsService implements OnModuleInit {
  private readonly logger = new Logger(WalletsService.name);
  private provider!: ethers.JsonRpcProvider;

  constructor(private readonly database: DatabaseService) {}

  onModuleInit() {
    this.provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    setInterval(() => {
      void this.sweepFundedDepositAddresses();
    }, 6_000);
  }

  async assignDepositAddressToInvoice(merchantId: string, invoiceId: string, network: string) {
    return this.database.reserveDepositAddress({ merchantId, invoiceId, network });
  }

  async recordIncomingFunds(address: string, amountCents: number) {
    return this.database.markDepositAddressFunded(address, amountCents);
  }

  async sweepFundedDepositAddresses() {
    const invoices = this.database.listInvoices();
    const addresses = this.database.listDepositAddresses();
    const minGasByNetwork: Record<string, number> = {
      ERC20: 1
    };

    for (const address of addresses) {
      if (address.status !== "FUNDED" || !address.invoiceId || address.balanceCents <= 0) {
        continue;
      }

      const invoice = invoices.find((item) => item.id === address.invoiceId);
      if (!invoice || !["PAID", "OVERPAID", "PARTIALLY_PAID"].includes(invoice.status)) {
        continue;
      }

      const hotVault = this.database.getHotVault(address.network);
      if (!hotVault) {
        continue;
      }

      const existing = this.database
        .listSweeps()
        .find((sweep) => sweep.depositAddressId === address.id && sweep.status === "COMPLETED");

      if (existing) {
        continue;
      }

      const requiredGas = minGasByNetwork[address.network] ?? 1;
      const mnemonic = process.env.WALLET_MNEMONIC || "test test test test test test test test test test test junk";

      if (address.nativeBalance < requiredGas) {
        const gasVault = this.database.getGasVault(address.network);
        if (!gasVault || !gasVault.derivationRoot) continue;

        const existingTopUp = this.database
          .listGasTopUps()
          .find((topUp) => topUp.depositAddressId === address.id && topUp.status === "COMPLETED");

        if (!existingTopUp) {
          try {
            this.logger.log(`Executing real Gas Top-up for ${address.address} from ${gasVault.address}`);
            const gasWalletNode = ethers.HDNodeWallet.fromPhrase(mnemonic, "", gasVault.derivationRoot);
            const gasWallet = new ethers.Wallet(gasWalletNode.privateKey, this.provider);
            
            const topUpAmount = ethers.parseEther("0.01");
            const tx = await gasWallet.sendTransaction({
              to: address.address,
              value: topUpAmount
            });
            await tx.wait(); // Wait for confirmation
            this.logger.log(`Gas Top-up successful! Tx: ${tx.hash}`);

            const topUp = await this.database.createGasTopUp({
              merchantId: invoice.merchantId,
              invoiceId: invoice.id,
              depositAddressId: address.id,
              fromVaultId: gasVault.id,
              fromAddress: gasVault.address,
              toAddress: address.address,
              network: address.network,
              nativeAmount: Number(topUpAmount),
              status: "PENDING",
              txHash: tx.hash
            });
            await this.database.completeGasTopUp(topUp.id, new Date().toISOString());
          } catch (error: any) {
            this.logger.error(`Gas Top-up failed: ${error.message}`);
            continue; // Skip sweeping if gas top up failed
          }
        }
      }

      try {
        this.logger.log(`Executing real Sweeping for ${address.address} to ${hotVault.address}`);
        const depositWalletNode = ethers.HDNodeWallet.fromPhrase(mnemonic, "", address.derivationPath);
        const depositWallet = new ethers.Wallet(depositWalletNode.privateKey, this.provider);
        const contract = new ethers.Contract(MOCK_USDT_ADDRESS, ERC20_ABI, depositWallet);
        
        // Transfer the entire amountCents (note: balanceCents is in cents, MockUSDT has 6 decimals, so * 10000)
        const amountUnits = BigInt(address.balanceCents) * 10000n;
        const tx = await contract.transfer(hotVault.address, amountUnits);
        await tx.wait();
        this.logger.log(`Sweep successful! Tx: ${tx.hash}`);

        const sweep = await this.database.createSweep({
          merchantId: invoice.merchantId,
          invoiceId: invoice.id,
          depositAddressId: address.id,
          fromAddress: address.address,
          toVaultId: hotVault.id,
          toAddress: hotVault.address,
          network: address.network,
          amountCents: address.balanceCents,
          status: "PENDING",
          txHash: tx.hash
        });

        await this.database.completeSweep(sweep.id, new Date().toISOString());
      } catch (error: any) {
        this.logger.error(`Sweep failed: ${error.message}`);
      }
    }
  }

  async getWalletOverview() {
    const vaults = this.database.listWalletVaults();
    const depositAddresses = this.database.listDepositAddresses();
    const sweeps = this.database.listSweeps();
    const hotByNetwork = new Map(vaults.filter((vault) => vault.type === "HOT").map((vault) => [vault.network, vault.address]));
    const gasByNetwork = new Map(vaults.filter((vault) => vault.type === "GAS").map((vault) => [vault.network, vault.address]));

    const contract = new ethers.Contract(MOCK_USDT_ADDRESS, ["function balanceOf(address) view returns (uint256)"], this.provider);

    const walletSystem = await Promise.all(
      vaults.map(async (vault) => {
        const usdt = await contract.balanceOf(vault.address);
        return {
          id: vault.id,
          network: vault.network,
          type: vault.type,
          label: vault.label,
          address: vault.address,
          derivationRoot: vault.derivationRoot,
          nativeBalance: vault.nativeBalance,
          usdtBalance: Number(usdt) / 1e6
        };
      })
    );

    return {
      walletSystem,
      depositPool: depositAddresses.map((address) => ({
        id: address.id,
        network: address.network,
        address: address.address,
        derivationPath: address.derivationPath,
        status: address.status,
        invoiceId: address.invoiceId,
        balanceCents: address.balanceCents,
        nativeBalance: address.nativeBalance
      })),
      gasTopUps: this.database.listGasTopUps().map((topUp) => ({
        invoiceId: topUp.invoiceId,
        fromAddress: topUp.fromAddress,
        toAddress: topUp.toAddress,
        network: topUp.network,
        nativeAmount: topUp.nativeAmount,
        txHash: topUp.txHash,
        status: topUp.status
      })),
      sweepSummary: sweeps.map((sweep) => ({
        invoiceId: sweep.invoiceId,
        fromAddress: sweep.fromAddress,
        toAddress: sweep.toAddress,
        network: sweep.network,
        amountCents: sweep.amountCents,
        txHash: sweep.txHash,
        status: sweep.status
      })),
      hotByNetwork: Object.fromEntries(hotByNetwork),
      gasByNetwork: Object.fromEntries(gasByNetwork)
    };
  }

  explainWalletFlow(invoiceId: string) {
    const invoice = this.database.findInvoice(invoiceId);
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }
    const depositAddress = this.database.findDepositAddressByInvoice(invoice.id);
    const gasVault = this.database.getGasVault(invoice.network);
    const hotVault = this.database.getHotVault(invoice.network);
    const sweep = this.database.listSweeps().find((item) => item.invoiceId === invoice.id) ?? null;
    const gasTopUp = this.database.listGasTopUps().find((item) => item.invoiceId === invoice.id) ?? null;

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerPaysTo: depositAddress?.address ?? invoice.paymentAddress,
      derivedFrom: depositAddress?.derivationPath ?? null,
      gasPolicy: gasVault
        ? `If ${depositAddress?.address ?? invoice.paymentAddress} lacks gas, ${gasVault.address} tops it up first.`
        : "Gas wallet is not configured.",
      afterReceiveFunds: hotVault
        ? `System sweeps confirmed funds from deposit address to hot wallet ${hotVault.address}.`
        : "Hot wallet is not configured.",
      latestGasTopUp: gasTopUp,
      latestSweep: sweep
    };
  }
}
