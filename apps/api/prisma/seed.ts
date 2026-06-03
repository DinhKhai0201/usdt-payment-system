import { PrismaClient, InvoiceStatus } from "@prisma/client";

const prisma = new PrismaClient();

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60_000);
}

async function main() {
  const merchant = await prisma.merchant.upsert({
    where: { email: process.env.DEFAULT_MERCHANT_EMAIL ?? "merchant@payflow.local" },
    update: {},
    create: {
      name: process.env.DEFAULT_MERCHANT_NAME ?? "PayFlow Studio",
      email: process.env.DEFAULT_MERCHANT_EMAIL ?? "merchant@payflow.local"
    }
  });

  const count = await prisma.invoice.count();
  if (count > 0) {
    return;
  }

  const demoInvoices = [
    {
      invoiceNumber: "INV-LOCAL-0001",
      customerName: "Acme Corp",
      customerEmail: "finance@acme.local",
      amountCents: 125000,
      network: "TRC20",
      status: InvoiceStatus.PAID,
      description: "Website development services",
      paymentAddress: "TRC20-DEMO-ACME-001",
      expiresAt: minutesFromNow(45),
      paidAt: new Date()
    },
    {
      invoiceNumber: "INV-LOCAL-0002",
      customerName: "Globex Ltd",
      customerEmail: "ops@globex.local",
      amountCents: 350000,
      network: "LOCAL_USDT",
      status: InvoiceStatus.WAITING_PAYMENT,
      description: "Subscription renewal",
      paymentAddress: "LOCAL-USDT-GLOBEX-002",
      expiresAt: minutesFromNow(30)
    },
    {
      invoiceNumber: "INV-LOCAL-0003",
      customerName: "Initech",
      customerEmail: "billing@initech.local",
      amountCents: 89000,
      network: "ERC20",
      status: InvoiceStatus.EXPIRED,
      description: "Consulting engagement",
      paymentAddress: "ERC20-DEMO-INITECH-003",
      expiresAt: new Date(Date.now() - 10 * 60_000)
    }
  ];

  for (const invoice of demoInvoices) {
    await prisma.invoice.create({
      data: {
        merchantId: merchant.id,
        ...invoice
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

