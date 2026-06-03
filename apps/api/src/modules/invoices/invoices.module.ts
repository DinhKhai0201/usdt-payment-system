import { Module } from "@nestjs/common";
import { PaymentsModule } from "../payments/payments.module";
import { WalletsModule } from "../wallets/wallets.module";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";

@Module({
  imports: [PaymentsModule, WalletsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService]
})
export class InvoicesModule {}
