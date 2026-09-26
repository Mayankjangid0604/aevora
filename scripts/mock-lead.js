const path = require('path');
try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch {}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.company.findFirst({ orderBy: { createdAt: 'desc' } });

  const lead = await prisma.salesLead.upsert({
    where: { companyId_googlePlaceId: { companyId: c.id, googlePlaceId: 'dine-in-to-home-dehradun-001' } },
    update: { status: 'NEW' },
    create: {
      companyId: c.id,
      name: 'Dine In To Home',
      organizationName: 'Dine In To Home',
      contactName: 'Hardik Bindal',
      contactEmail: null,
      contactPhone: '7000344979',
      industry: 'restaurant',
      geography: 'Dehradun, Uttarakhand, India',
      website: null,
      googlePlaceId: 'dine-in-to-home-dehradun-001',
      qualityScore: 90,
      status: 'NEW',
      source: 'MANUAL',
      notes: 'Family restaurant in Dehradun. Contact: Hardik Bindal.',
    },
  });

  console.log('Client lead ready:', lead.id);
  console.log('Business:', lead.name);
  console.log('Contact:', lead.contactName, lead.contactPhone);
  console.log('Status:', lead.status);
}
main().finally(() => prisma.$disconnect());
