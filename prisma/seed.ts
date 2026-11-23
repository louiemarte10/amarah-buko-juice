import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Amarah Buko Juice…");

  // --- Roles ---------------------------------------------------------------
  const adminRole = await prisma.staffRole.upsert({
    where: { name: "Administrator" },
    update: {},
    create: { name: "Administrator", isAdmin: true },
  });
  const cashierRole = await prisma.staffRole.upsert({
    where: { name: "Cashier" },
    update: {},
    create: { name: "Cashier", isAdmin: false },
  });

  // --- Users ---------------------------------------------------------------
  const adminPassword = await bcrypt.hash("admin123", 10);
  const cashierPassword = await bcrypt.hash("cashier123", 10);

  await prisma.user.upsert({
    where: { email: "admin@amarah.local" },
    update: {},
    create: {
      name: "Shop Admin",
      email: "admin@amarah.local",
      passwordHash: adminPassword,
      role: "ADMIN",
      staffRoleId: adminRole.id,
    },
  });
  await prisma.user.upsert({
    where: { email: "cashier@amarah.local" },
    update: {},
    create: {
      name: "Front Cashier",
      email: "cashier@amarah.local",
      passwordHash: cashierPassword,
      role: "CASHIER",
      staffRoleId: cashierRole.id,
    },
  });

  // Only seed catalog data once.
  const productCount = await prisma.product.count();
  if (productCount > 0) {
    console.log("Products already exist — skipping catalog seed.");
    return;
  }

  // --- Categories ----------------------------------------------------------
  const [bukoDrinks, shakes, addons, bottled] = await Promise.all([
    prisma.category.create({ data: { name: "Buko Drinks" } }),
    prisma.category.create({ data: { name: "Shakes & Specials" } }),
    prisma.category.create({ data: { name: "Add-ons" } }),
    prisma.category.create({ data: { name: "Bottled" } }),
  ]);

  // --- Suppliers -----------------------------------------------------------
  const farm = await prisma.supplier.create({
    data: {
      name: "Local Buko Farm",
      contact: "Mang Tonyo",
      phone: "0917-000-0000",
    },
  });
  const packaging = await prisma.supplier.create({
    data: { name: "Packaging Supplier", contact: "QC Plastics" },
  });

  // --- Products (prices in centavos) --------------------------------------
  const products = [
    { name: "Buko Juice (Regular)", priceCents: 3500, costCents: 1500, stock: 80, unit: "cup", categoryId: bukoDrinks.id, supplierId: farm.id, sku: "BUKO-REG" },
    { name: "Buko Juice (Large)", priceCents: 5000, costCents: 2200, stock: 80, unit: "cup", categoryId: bukoDrinks.id, supplierId: farm.id, sku: "BUKO-LRG" },
    { name: "Buko Shake", priceCents: 6000, costCents: 2800, stock: 50, unit: "cup", categoryId: shakes.id, supplierId: farm.id, sku: "BUKO-SHK" },
    { name: "Buko Pandan", priceCents: 6500, costCents: 3000, stock: 40, unit: "cup", categoryId: shakes.id, supplierId: farm.id, sku: "BUKO-PAN" },
    { name: "Buko Lychee", priceCents: 7000, costCents: 3200, stock: 35, unit: "cup", categoryId: shakes.id, supplierId: farm.id, sku: "BUKO-LYC" },
    { name: "Extra Buko Meat", priceCents: 1500, costCents: 600, stock: 100, unit: "serving", categoryId: addons.id, supplierId: farm.id, sku: "ADD-MEAT" },
    { name: "Sago / Pearls", priceCents: 1000, costCents: 400, stock: 100, unit: "serving", categoryId: addons.id, supplierId: packaging.id, sku: "ADD-SAGO" },
    { name: "Nata de Coco", priceCents: 1000, costCents: 400, stock: 8, unit: "serving", categoryId: addons.id, supplierId: packaging.id, sku: "ADD-NATA" },
    { name: "Bottled Buko 500ml", priceCents: 4500, costCents: 2000, stock: 60, unit: "bottle", categoryId: bottled.id, supplierId: farm.id, sku: "BTL-500" },
    { name: "Bottled Buko 1L", priceCents: 9000, costCents: 4000, stock: 5, unit: "bottle", categoryId: bottled.id, supplierId: farm.id, sku: "BTL-1L" },
  ];

  for (const p of products) {
    await prisma.product.create({ data: { ...p, lowStockThreshold: 10 } });
  }

  console.log(`Seeded ${products.length} products, 4 categories, 2 suppliers, 2 users.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
