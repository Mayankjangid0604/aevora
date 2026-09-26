import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🔥 Starting AEVORA Internal Burn-In Protocol 🔥');
  
  let cycles = 0;
  
  while (true) {
    cycles++;
    console.log(`\n--- Burn-In Cycle ${cycles} ---`);
    
    try {
      const start = Date.now();
      
      // 1. Database Performance Check
      const company = await prisma.company.findFirst({
        include: { employees: true, departments: true }
      });
      
      if (!company) {
        console.log('No company found. Make sure DB is seeded.');
        break;
      }
      
      // 2. Simulate AI Task Generation
      const randomTask = await prisma.task.create({
        data: {
          title: `Internal Optimization Cycle ${cycles}`,
          status: 'READY',
          companyId: company.id,
          assignedEmployeeId: company.employees[0]?.id || null,
          createdBy: 'SYSTEM_BURN_IN',
        }
      });
      
      console.log(`[+] Task Generated: ${randomTask.id}`);
      
      // 3. Simulate Background Job / Audit logging
      await prisma.companyEvent.create({
        data: {
          companyId: company.id,
          type: 'BURN_IN_CYCLE',
          payload: { cycle: cycles, latencyMs: Date.now() - start }
        }
      });
      
      console.log(`[+] Latency: ${Date.now() - start}ms`);
      
      // Artificial delay (Wait 5 seconds between cycles)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error(`[!] Burn-In Error in cycle ${cycles}:`, error);
      // Wait before retrying to prevent log flood
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
