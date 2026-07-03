import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ListingsModule } from "./modules/listings/listings.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { SearchModule } from "./modules/search/search.module";
import { VerificationModule } from "./modules/verification/verification.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ListingsModule,
    SearchModule,
    PaymentsModule,
    VerificationModule,
    AdminModule,
  ],
})
export class AppModule {}
