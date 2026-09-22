import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const categories = [
  { name: "Gaji", type: "income", icon: "💼" },
  { name: "Freelance", type: "income", icon: "🧑‍💻" },
  { name: "Investasi", type: "income", icon: "📈" },
  { name: "Lainnya (Masuk)", type: "income", icon: "➕" },
  { name: "Makanan", type: "expense", icon: "🍜" },
  { name: "Transportasi", type: "expense", icon: "🚗" },
  { name: "Belanja", type: "expense", icon: "🛒" },
  { name: "Tagihan", type: "expense", icon: "🧾" },
  { name: "Hiburan", type: "expense", icon: "🎮" },
  { name: "Kesehatan", type: "expense", icon: "💊" },
  { name: "Pendidikan", type: "expense", icon: "📚" },
  { name: "Lainnya (Keluar)", type: "expense", icon: "➖" },
];

async function main() {
  console.log("Seed kategori...");
  for (const c of categories) {
    const existing = await prisma.category.findFirst({ where: { userId: null, name: c.name } });
    if (!existing) await prisma.category.create({ data: { ...c, icon: "tag", userId: null } });
  }
  console.log(`Done: ${categories.length} kategori.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
