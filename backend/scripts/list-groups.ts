import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const groups = await db.group.findMany({ take: 3, where: { isActive: true } });
console.log(JSON.stringify(groups, null, 2));
await db.$disconnect();
