const path = require('path');
try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch {}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  if (!company) {
    console.error('No company. Run create-admin first.');
    process.exit(1);
  }
  console.log('Company:', company.name, company.id);

  let execDept = await prisma.department.findFirst({ where: { name: 'Executive', companyId: company.id } });
  if (!execDept) execDept = await prisma.department.create({ data: { name: 'Executive', companyId: company.id, status: 'ACTIVE' } });

  let salesDept = await prisma.department.findFirst({ where: { name: 'Sales', companyId: company.id } });
  if (!salesDept) salesDept = await prisma.department.create({ data: { name: 'Sales', companyId: company.id, status: 'ACTIVE' } });

  let ceoRole = await prisma.role.findFirst({ where: { title: 'Chief Executive Officer', companyId: company.id } });
  if (!ceoRole) ceoRole = await prisma.role.create({ data: { title: 'Chief Executive Officer', company: { connect: { id: company.id } }, level: 10 } });

  let salesRole = await prisma.role.findFirst({ where: { title: 'Sales Representative', companyId: company.id } });
  if (!salesRole) salesRole = await prisma.role.create({ data: { title: 'Sales Representative', company: { connect: { id: company.id } }, level: 3 } });

  let ceoEmp = await prisma.employee.findFirst({ where: { name: 'ARIA', companyId: company.id } });
  if (!ceoEmp) {
    ceoEmp = await prisma.employee.create({
      data: {
        name: 'ARIA',
        identitySeed: 'ceo@saahvik.ai',
        companyId: company.id, departmentId: execDept.id,
        roleId: ceoRole.id, status: 'ACTIVE', activity: 'WORKING'
      }
    });
  } else {
    ceoEmp = await prisma.employee.update({ where: { id: ceoEmp.id }, data: { status: 'ACTIVE', activity: 'WORKING' } });
  }

  let agent1 = await prisma.agent.findUnique({ where: { employeeId: ceoEmp.id } });
  if (!agent1) {
    await prisma.agent.create({
      data: {
        employeeId: ceoEmp.id,
        status: 'ACTIVE', autonomyLevel: 'AUTONOMOUS',
        configuration: { systemInstructions: 'You are ARIA, CEO of SAAHVIK Tech based in Sikar, Rajasthan. You find local businesses needing websites, SaaS products, and automation. You manage the sales pipeline and grow revenue. Think in INR. Target local Sikar and Rajasthan businesses.' }
      }
    });
  }

  let salesEmp = await prisma.employee.findFirst({ where: { name: 'NOVA', companyId: company.id } });
  if (!salesEmp) {
    salesEmp = await prisma.employee.create({
      data: {
        name: 'NOVA',
        identitySeed: 'sales@saahvik.ai',
        companyId: company.id, departmentId: salesDept.id,
        roleId: salesRole.id, status: 'ACTIVE', activity: 'WORKING'
      }
    });
  } else {
    salesEmp = await prisma.employee.update({ where: { id: salesEmp.id }, data: { status: 'ACTIVE', activity: 'WORKING' } });
  }

  let agent2 = await prisma.agent.findUnique({ where: { employeeId: salesEmp.id } });
  if (!agent2) {
    await prisma.agent.create({
      data: {
        employeeId: salesEmp.id,
        status: 'ACTIVE', autonomyLevel: 'ASSISTED',
        configuration: { systemInstructions: 'You are NOVA, sales agent at SAAHVIK Tech. Contact local businesses in Sikar and Rajasthan. Offer websites (₹8,000-₹25,000), automation (₹5,000-₹20,000), SaaS (₹15,000-₹50,000). Be friendly and professional in Hindi and English.' }
      }
    });
  }

  const acct = await prisma.realMoneyAccount.findFirst({ where: { companyId: company.id } });
  if (!acct) {
    await prisma.realMoneyAccount.create({ data: { companyId: company.id, balancePaise: 0, currency: 'INR' } });
    console.log('Created RealMoneyAccount');
  }

  const sim = await prisma.simulationState.findFirst({ where: { companyId: company.id } });
  if (!sim) {
    await prisma.simulationState.create({ data: { companyId: company.id, status: 'STOPPED', speed: 1 } });
    console.log('Created SimulationState');
  }

  const survival = await prisma.survivalConfig.findFirst({ where: { companyId: company.id } });
  if (!survival) {
    await prisma.survivalConfig.create({ data: { companyId: company.id, minBalancePaise: 50000, warningBalancePaise: 200000, currentStatus: 'HEALTHY' } });
    console.log('Created SurvivalConfig');
  }

  const existingScript = await prisma.outreachScript.findFirst({ where: { companyId: company.id, isActive: true, channel: 'EMAIL' } });
  if (!existingScript) {
    await prisma.outreachScript.create({
      data: {
        companyId: company.id, channel: 'EMAIL', templateName: 'local-business-hindi-english', isActive: true,
        subjectTemplate: '{{businessName}} ke liye ek khaas offer - Free Website Demo',
        bodyTemplate: `Namaskar {{businessName}} team,\n\nMera naam Mayank Jangid hai. Main SAAHVIK Tech, Sikar se hun.\n\nAapka business dekha - aap ek acha kaam kar rahe hain. Main aapke liye ek professional website ya business automation solution banana chahta hun jo aapke customers badha sake.\n\nHum offer karte hain:\n- Professional Website: ₹8,000 se shuru\n- Business Automation: ₹5,000 se shuru  \n- Custom Software: ₹15,000 se shuru\n\nFree demo ke liye reply karein ya call karein.\n\nSAAHVIK Tech, Sikar\nMayank Jangid`
      }
    });
    console.log('Created default outreach script');
  }

  console.log('\n✅ Setup complete!');
  console.log('CEO: ARIA -', ceoEmp.id);
  console.log('Sales: NOVA -', salesEmp.id);
}

main()
  .catch(e => { console.error(e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
