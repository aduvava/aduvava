import { PrismaClient } from "@prisma/client";
import { storeCatalog } from "../src/data/store-catalog";

const prisma = new PrismaClient();

async function main() {
  for (const item of storeCatalog) {
    await prisma.storeItem.upsert({
      where: { slug: item.slug },
      update: item,
      create: item,
    });
  }
  console.log(`Upserted ${storeCatalog.length} store items.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
