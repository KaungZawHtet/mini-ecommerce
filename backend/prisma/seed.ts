import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      email: 'demo@example.com',
      passwordHash,
    },
  });

  const existingProductCount = await prisma.product.count();

  if (existingProductCount < 100) {
    await prisma.product.createMany({
      data: Array.from({ length: 100 }, (_, index) => {
        const productNumber = index + 1;

        return {
          name: `Catalog Product ${productNumber}`,
          description: `A reviewer-friendly sample product for validating catalog pagination and scrolling behavior. Item ${productNumber} includes stock and pricing data.`,
          price: Number((19.99 + index * 1.25).toFixed(2)),
          imageUrl: `https://picsum.photos/seed/mini-ecommerce-${productNumber}/640/480`,
          stock: 10 + (index % 35),
          createdAt: new Date(Date.now() - index * 60_000),
        };
      }),
      skipDuplicates: true,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
