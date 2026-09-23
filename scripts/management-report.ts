import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 AEVORA Chairman Management Report 📊\n');

  const company = await prisma.company.findFirst();
  if (!company) {
    console.log('No company found.');
    return;
  }

  // 1. Revenue
  const treasury = await prisma.aCWallet.findFirst({ where: { companyId: company.id, employeeId: null } });
  const realMoney = await prisma.realMoneyAccount.findFirst({ where: { companyId: company.id } });
  
  console.log('--- FINANCIAL STANDING ---');
  console.log(`AC Treasury Balance:  ${treasury ? treasury.balance / 100 : 0} AC`);
  console.log(`Real Money Reserve:   $${realMoney ? realMoney.balance / 100 : 0} USD\n`);

  // 2. Customer Activity
  const clients = await prisma.client.count({ where: { companyId: company.id } });
  console.log('--- BUSINESS METRICS ---');
  console.log(`Total Active Clients: ${clients}\n`);

  // 3. Complete Lifecycle Audit Trail
  console.log('--- RECENT LIFECYCLE AUDIT (Chairman Review) ---');
  const events = await prisma.companyEvent.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  if (events.length === 0) {
    console.log('No recent events recorded.');
  } else {
    events.forEach(event => {
      console.log(`[${event.createdAt.toISOString()}] ${event.type}`);
      if (event.payload) {
        console.log(`    Details: ${JSON.stringify(event.payload)}`);
      }
    });
  }

  console.log('\n✅ Report generation complete.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
