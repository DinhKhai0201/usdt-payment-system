import { DatabaseService } from "./database.service";

async function main() {
  const service = new DatabaseService();
  await service.onModuleInit();
  await service.seed();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
