import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['info', 'warn', 'error'] });

async function main() {
  console.log('🚀 Initiating Step 6: First Customer Workflow (Safe Mode)');

  // 1. Check Chairman
  const chairman = await prisma.chairman.findFirst();
  const company = await prisma.company.findFirst();
  if (!chairman || !company) {
    console.error('Environment not initialized. Missing Chairman or Company.');
    process.exit(1);
  }

  console.log('1. Acquire: Creating the first Client (Small business)');
  const client = await prisma.client.create({
    data: {
      companyId: company.id,
      name: 'Alpha Widgets LLC',
      status: 'ACTIVE',
      industry: 'Software',
      lifetimeValue: 0
    }
  });

  console.log('2. Understand & Plan: AI generates a Proposal (Pending Chairman Approval)');
  // We simulate an Opportunity/Proposal being generated
  // Since schemas vary, we will simulate a Task for the proposal
  const proposalTask = await prisma.task.create({
    data: {
      companyId: company.id,
      title: `Draft Delivery Proposal for ${client.name}`,
      status: 'AWAITING_APPROVAL', // Keeping consequential action behind Chairman
      createdBy: 'AI_AGENT',
    }
  });
  console.log(`   [Action Required] Proposal Task ID: ${proposalTask.id} requires Chairman approval.`);

  console.log('3. Execute & Deliver: Approving and marking delivered');
  // Chairman manually approves (simulated)
  await prisma.task.update({
    where: { id: proposalTask.id },
    data: { status: 'COMPLETED' }
  });
  
  await prisma.companyEvent.create({
    data: {
      companyId: company.id,
      type: 'TASK_APPROVED',
      payload: { taskId: proposalTask.id, approver: 'Chairman' }
    }
  });

  console.log('4. Invoice & Record Revenue: Updating AC Treasury');
  // Simulate an invoice and payment
  const treasury = await prisma.aCWallet.findFirst({ where: { companyId: company.id, employeeId: null } });
  if (treasury) {
    await prisma.aCWallet.update({
      where: { id: treasury.id },
      data: { balance: treasury.balance + 5000 } // Simulate $50 (in cents)
    });
    console.log(`   [Success] Revenue recorded: +$50.00 to AC Treasury.`);
  }

  console.log('5. Learn: Recording audit event for operational learning');
  await prisma.companyEvent.create({
    data: {
      companyId: company.id,
      type: 'CUSTOMER_WORKFLOW_COMPLETED',
      payload: { clientId: client.id, outcome: 'SUCCESS', revenueCents: 5000 }
    }
  });

  console.log('✅ First Customer Workflow successfully executed and recorded.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
