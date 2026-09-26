const path = require('path');
try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch {}
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../apps/api/dist/app.module');
const { SalesAgentWorker } = require('../apps/api/dist/sales-outreach/sales-agent.worker');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.company.findFirst({ orderBy: { createdAt: 'desc' } });
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const salesWorker = app.get(SalesAgentWorker);
  
  try {
    const res = await salesWorker.processQueue(c.id);
    console.log('Process queue result:', res);
  } catch (err) {
    console.error('Error:', err);
  }
  
  await app.close();
  await prisma.$disconnect();
}
main().catch(console.error);
