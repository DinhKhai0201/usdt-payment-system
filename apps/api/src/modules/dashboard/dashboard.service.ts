import { Injectable } from "@nestjs/common";
import { DashboardOverview } from "@payflow/shared";
import { formatUsdToken } from "../../common/format";
import { toInvoiceRecord } from "../../common/mappers";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  async getOverview(): Promise<DashboardOverview> {
    await this.database.expireInvoices();
    const allInvoices = this.database.listInvoices();
    const recentInvoices = allInvoices.slice(0, 8);
    const deposits = this.database.listDeposits();
    const ledger = this.database.listLedger();
    const paidCount = allInvoices.filter((invoice) => ["PAID", "OVERPAID"].includes(invoice.status)).length;
    const pendingCount = allInvoices.filter((invoice) =>
      ["PENDING", "WAITING_PAYMENT", "CONFIRMING"].includes(invoice.status)
    ).length;
    const totalVolume = ledger.reduce((sum, entry) => sum + entry.amountCents, 0);
    const avgConfirmations = deposits.length
      ? deposits.reduce((sum, deposit) => sum + deposit.confirmations, 0) / deposits.length
      : 0;

    return {
      metrics: [
        {
          label: "Total Volume",
          value: `${formatUsdToken(totalVolume)} USDT`,
          change: "+12.4%",
          trend: "up"
        },
        {
          label: "Successful Payments",
          value: String(paidCount),
          change: "+8.3%",
          trend: "up"
        },
        {
          label: "Pending Invoices",
          value: String(pendingCount),
          change: "Core flow focus",
          trend: "neutral"
        },
        {
          label: "Avg. Confirmations",
          value: `${avgConfirmations.toFixed(1)} blocks`,
          change: "local watcher",
          trend: "neutral"
        }
      ],
      invoices: recentInvoices.map((invoice) =>
        toInvoiceRecord({
          ...invoice,
          deposits: deposits.filter((deposit) => deposit.invoiceId === invoice.id).slice(0, 1)
        })
      ),
      networkStatus: [
        { network: "ERC20", status: "supported", label: "Primary EVM mock USDT network for the demo" }
      ],
      systemStatus: [
        { service: "API", status: "operational" },
        { service: "Invoice Service", status: "operational" },
        { service: "Payment Watcher", status: "operational" },
        { service: "Local Database", status: "operational" }
      ]
    };
  }
}
