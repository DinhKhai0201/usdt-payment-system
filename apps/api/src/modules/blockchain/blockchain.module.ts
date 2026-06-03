import { Module } from "@nestjs/common";
import { BlockchainWatcherService } from "./blockchain.service";
import { DatabaseModule } from "../database/database.module";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [DatabaseModule, PaymentsModule],
  providers: [BlockchainWatcherService],
  exports: [BlockchainWatcherService]
})
export class BlockchainModule {}
