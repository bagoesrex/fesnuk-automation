import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const [accounts, groups, posts, schedules, logs] = await Promise.all([
  db.account.findMany(),
  db.group.findMany({ take: 5, where: { isActive: true } }),
  db.post.findMany(),
  db.schedule.findMany({ include: { scheduleGroups: true } }),
  db.postLog.count(),
]);

console.log('=== DB STATUS ===');
console.log('Accounts:', accounts.length, JSON.stringify(accounts.map(a => ({ id: a.id, name: a.name }))));
console.log('Groups (active, 5):', JSON.stringify(groups.map(g => ({ id: g.id, fbGroupId: g.fbGroupId, name: g.name.slice(0, 40) }))));
console.log('Posts:', posts.length, JSON.stringify(posts.map(p => ({ id: p.id, title: p.title, images: (JSON.parse(p.imagePaths) as string[]).length }))));
console.log('Schedules:', schedules.length, JSON.stringify(schedules.map(s => ({ id: s.id, name: s.name, status: s.status, groups: s.scheduleGroups.length }))));
console.log('PostLogs total:', logs);

const testGroup = await db.group.findFirst({ where: { fbGroupId: '1592012502030681' } });
console.log('Test group (1592012502030681):', testGroup ? `EXISTS id=${testGroup.id}` : 'NOT IN DB');

await db.$disconnect();
