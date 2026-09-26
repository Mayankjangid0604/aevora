const path = require('path');
try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch {}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.company.findFirst({ orderBy: { createdAt: 'desc' } });
  const leads = await prisma.salesLead.findMany({ where: { companyId: c.id } });
  console.log('Leads:', leads.length);
}
main().finally(() => prisma.$disconnect());
