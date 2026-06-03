import { Global, Module } from "@nestjs/common";
import { WalletsModule } from "../wallets/wallets.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Global()
@Module({
  imports: [WalletsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService]
})
export class PaymentsModule {}
