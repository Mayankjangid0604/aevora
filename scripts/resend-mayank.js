const path = require('path');
try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch {}
const { PrismaClient } = require('@prisma/client');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../apps/api/dist/app.module');
const { SalesAgentWorker } = require('../apps/api/dist/sales-outreach/sales-agent.worker');

const prisma = new PrismaClient();

async function main() {
  const c = await prisma.company.findFirst({ orderBy: { createdAt: 'desc' } });
  
  // Find Mayank lead
  const lead = await prisma.salesLead.findFirst({
    where: { contactEmail: 'mayankjangid598@gmail.com' }
  });

  if (lead) {
    // Delete the campaign
    await prisma.outreachCampaign.deleteMany({
      where: { leadId: lead.id }
    });
    // Set lead to NEW
    await prisma.salesLead.update({
      where: { id: lead.id },
      data: { status: 'NEW' }
    });
    console.log('Reset lead for Mayank');
  } else {
    console.log('Lead not found');
    return;
  }

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
