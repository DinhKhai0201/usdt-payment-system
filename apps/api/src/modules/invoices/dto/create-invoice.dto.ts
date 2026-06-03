import { IsEmail, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { supportedNetworks } from "@payflow/shared";

export class CreateInvoiceDto {
  @IsString()
  @MaxLength(120)
  customerName!: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsIn(supportedNetworks)
  network!: (typeof supportedNetworks)[number];

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  expiryMinutes?: number;
}

