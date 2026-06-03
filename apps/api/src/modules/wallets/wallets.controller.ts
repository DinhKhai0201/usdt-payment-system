import { Controller, Get, Param } from "@nestjs/common";
import { WalletsService } from "./wallets.service";

@Controller("wallets")
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get("overview")
  getOverview() {
    return this.walletsService.getWalletOverview();
  }

  @Get("explain/:invoiceId")
  explainInvoiceWalletFlow(@Param("invoiceId") invoiceId: string) {
    return this.walletsService.explainWalletFlow(invoiceId);
  }
}
