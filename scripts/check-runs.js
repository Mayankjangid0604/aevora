const path = require('path');
try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch {}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.company.findFirst({ orderBy: { createdAt: 'desc' } });
  const runs = await prisma.leadGenRun.findMany({ where: { companyId: c.id } });
  console.log('Runs:', runs);
}
main().finally(() => prisma.$disconnect());
