import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Fixed id keeps the seed idempotent: Channel.name is not unique.
const TEST_CHANNEL_ID = '00000000-0000-7000-8000-000000000001';
const TEST_USER_ID = '00000000-0000-7000-8000-000000000002';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is not set');
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const user = await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: { id: TEST_USER_ID, name: 'test-user' },
    });
    console.log(`Seeded user ${user.name} (${user.id})`);
    const channel = await prisma.channel.upsert({
      where: { id: TEST_CHANNEL_ID },
      update: {},
      create: { id: TEST_CHANNEL_ID, name: 'general', description: 'Test channel' },
    });
    console.log(`Seeded channel ${channel.name} (${channel.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
