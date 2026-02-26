import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, username: true, email: true }
    });
    console.log('Users in database:', JSON.stringify(users, null, 2));

    const friends = await prisma.friend.findMany({
        include: {
            requester: { select: { username: true } },
            receiver: { select: { username: true } }
        }
    });
    console.log('Friend relations:', JSON.stringify(friends, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
