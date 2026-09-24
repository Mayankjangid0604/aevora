const path = require('path');
try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch {}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the company
  const company = await prisma.company.findFirst();
  if (!company) { console.error('No company found. Run create-admin.js first.'); process.exit(1); }
  
  console.log('Seeding employees for company:', company.name, company.id);

  // Create or find departments
  let execDept = await prisma.department.findFirst({
    where: { name: 'Executive', companyId: company.id }
  });
  if (!execDept) {
    execDept = await prisma.department.create({
      data: { name: 'Executive', companyId: company.id, status: 'ACTIVE' }
    });
  }

  let salesDept = await prisma.department.findFirst({
    where: { name: 'Sales', companyId: company.id }
  });
  if (!salesDept) {
    salesDept = await prisma.department.create({
      data: { name: 'Sales', companyId: company.id, status: 'ACTIVE' }
    });
  }

  // Create or find roles
  let ceoRole = await prisma.role.findFirst({
    where: { title: 'Chief Executive Officer', companyId: company.id }
  });
  if (!ceoRole) {
    ceoRole = await prisma.role.create({
      data: { title: 'Chief Executive Officer', companyId: company.id, level: 10 }
    });
  }

  let salesRole = await prisma.role.findFirst({
    where: { title: 'Sales Representative', companyId: company.id }
  });
  if (!salesRole) {
    salesRole = await prisma.role.create({
      data: { title: 'Sales Representative', companyId: company.id, level: 3 }
    });
  }

  // Create CEO employee
  let ceoEmp = await prisma.employee.findFirst({
    where: { name: 'ARIA CEO', companyId: company.id }
  });
  if (!ceoEmp) {
    ceoEmp = await prisma.employee.create({
      data: {
        name: 'ARIA CEO',
        identitySeed: 'ceo-seed',
        companyId: company.id,
        departmentId: execDept.id,
        roleId: ceoRole.id,
        status: 'ACTIVE',
        activity: 'WORKING',
      }
    });
  } else {
    ceoEmp = await prisma.employee.update({
      where: { id: ceoEmp.id },
      data: { status: 'ACTIVE' }
    });
  }

  // Create CEO agent
  let ceoAgent = await prisma.agent.findFirst({
    where: { employeeId: ceoEmp.id }
  });
  if (!ceoAgent) {
    ceoAgent = await prisma.agent.create({
      data: {
        employeeId: ceoEmp.id,
        status: 'ACTIVE',
        autonomyLevel: 'AUTONOMOUS',
        configuration: {
          systemInstructions: 'You are the CEO of SAAHVIK Tech, an AI tech services company. You find clients, manage the sales pipeline, and grow the business.'
        }
      }
    });
  } else {
    ceoAgent = await prisma.agent.update({
      where: { employeeId: ceoEmp.id },
      data: { status: 'ACTIVE', autonomyLevel: 'AUTONOMOUS' }
    });
  }

  // Create Sales employee  
  let salesEmp = await prisma.employee.findFirst({
    where: { name: 'NOVA Sales', companyId: company.id }
  });
  if (!salesEmp) {
    salesEmp = await prisma.employee.create({
      data: {
        name: 'NOVA Sales',
        identitySeed: 'sales-seed',
        companyId: company.id,
        departmentId: salesDept.id,
        roleId: salesRole.id,
        status: 'ACTIVE',
        activity: 'WORKING',
      }
    });
  } else {
    salesEmp = await prisma.employee.update({
      where: { id: salesEmp.id },
      data: { status: 'ACTIVE' }
    });
  }

  // Create Sales agent
  let salesAgent = await prisma.agent.findFirst({
    where: { employeeId: salesEmp.id }
  });
  if (!salesAgent) {
    salesAgent = await prisma.agent.create({
      data: {
        employeeId: salesEmp.id,
        status: 'ACTIVE',
        autonomyLevel: 'ASSISTED',
        configuration: {
          systemInstructions: 'You are a sales representative at SAAHVIK Tech. You find and contact potential clients for web development, SaaS, and automation services.'
        }
      }
    });
  } else {
    salesAgent = await prisma.agent.update({
      where: { employeeId: salesEmp.id },
      data: { status: 'ACTIVE', autonomyLevel: 'ASSISTED' }
    });
  }

  // Create RealMoneyAccount if it doesn't exist
  const existing = await prisma.realMoneyAccount.findFirst({ where: { companyId: company.id } });
  if (!existing) {
    await prisma.realMoneyAccount.create({
      data: { companyId: company.id, balance: 0 }
    });
    console.log('Created RealMoneyAccount (balance: ₹0)');
  }

  // Create SimulationState if it doesn't exist
  const sim = await prisma.simulationState.findFirst({ where: { companyId: company.id } });
  if (!sim) {
    await prisma.simulationState.create({
      data: { companyId: company.id, status: 'STOPPED', speedMultiplier: 1.0 }
    });
    console.log('Created SimulationState');
  }

  // Create SurvivalConfig if it doesn't exist
  const surv = await prisma.survivalConfig.findFirst({ where: { companyId: company.id } });
  if (!surv) {
    await prisma.survivalConfig.create({
      data: {
        companyId: company.id,
        minBalancePaise: parseInt(process.env.MIN_BALANCE_PAISE || '50000'),
        warningBalancePaise: parseInt(process.env.WARNING_BALANCE_PAISE || '200000'),
        currentStatus: 'HEALTHY',
      }
    });
    console.log('Created SurvivalConfig');
  }

  console.log('\n✅ Done!');
  console.log('CEO:', ceoEmp.name, ceoEmp.id);
  console.log('Sales:', salesEmp.name, salesEmp.id);
  console.log('\nNext: start the API and deposit money at /survival');
}

main()
  .catch(e => { console.error(e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
