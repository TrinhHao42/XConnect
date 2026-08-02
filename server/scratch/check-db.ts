import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.friendRequest.count();
    console.log('FriendRequest count:', count);
    const users = await prisma.user.findMany({ take: 5 });
    console.log('Sample users:', JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
