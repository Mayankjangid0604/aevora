const path = require('path');
try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch {}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const companies = await prisma.company.findMany();
  console.log('Companies:', companies);
  const chairmen = await prisma.chairman.findMany();
  console.log('Chairmen:', chairmen);
  const employees = await prisma.employee.findMany();
  console.log('Employees:', employees);
}
main().finally(() => prisma.$disconnect());
