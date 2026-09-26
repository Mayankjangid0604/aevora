const path = require('path');
try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch {}
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../apps/api/dist/app.module');
const { LeadGenService } = require('../apps/api/dist/lead-gen/lead-gen.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.company.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log('Company:', c.id);

  const app = await NestFactory.createApplicationContext(AppModule);
  const leadGen = app.get(LeadGenService);
  
  try {
    const run = await leadGen.runForCompany(c.id, 'MANUAL', c.chairmanId);
    console.log('Run result:', run);
  } catch (err) {
    console.error('Error running lead gen:', err);
  }
  
  await app.close();
  await prisma.$disconnect();
}
main().catch(console.error);
