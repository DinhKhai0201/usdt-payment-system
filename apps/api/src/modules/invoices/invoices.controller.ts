import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { InvoicesService } from "./invoices.service";

@Controller()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get("invoices")
  listInvoices() {
    return this.invoicesService.listInvoices();
  }

  @Post("invoices")
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.createInvoice(dto);
  }

  @Get("public/invoices/:id")
  getPublicInvoice(@Param("id") id: string) {
    return this.invoicesService.getPublicInvoice(id);
  }
}

