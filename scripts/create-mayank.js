const path = require('path');
try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch {}
const { PrismaClient } = require('@prisma/client');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../apps/api/dist/app.module');
const { SalesAgentWorker } = require('../apps/api/dist/sales-outreach/sales-agent.worker');

const prisma = new PrismaClient();

async function main() {
  const c = await prisma.company.findFirst({ orderBy: { createdAt: 'desc' } });
  
  // Insert the specific lead
  const lead = await prisma.salesLead.create({
    data: {
      companyId: c.id,
      name: 'Mayank',
      organizationName: 'Mayank',
      contactName: 'Mayank',
      contactEmail: 'mayankjangid598@gmail.com',
      status: 'NEW',
      source: 'MANUAL',
      googlePlaceId: 'mayank-lead-' + Date.now(),
      qualityScore: 95,
      notes: 'Needs a website.'
    }
  });
  console.log('Created lead for Mayank:', lead.id);

  // Force sales processing
  const app = await NestFactory.createApplicationContext(AppModule);
  const salesWorker = app.get(SalesAgentWorker);
  
  try {
    const res = await salesWorker.processQueue(c.id);
    console.log('Process queue result:', res);
  } catch (err) {
    console.error('Error in sales processing:', err);
  }
  
  await app.close();
  await prisma.$disconnect();
}
main().catch(console.error);
