import { Module } from "@nestjs/common";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { BlockchainModule } from "./modules/blockchain/blockchain.module";
import { WalletsModule } from "./modules/wallets/wallets.module";

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    WalletsModule,
    InvoicesModule,
    PaymentsModule,
    DashboardModule,
    BlockchainModule
  ]
})
export class AppModule {}
