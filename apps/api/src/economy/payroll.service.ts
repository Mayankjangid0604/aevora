import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from './economy.service';
import { PayrollStatus } from '@prisma/client';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private economyService: EconomyService
  ) {}

  async createPayrollRun(companyId: string, periodStart: Date, periodEnd: Date) {
    const employees = await this.prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: { acWallet: true }
    });

    let totalAmount = 0;
    const entries = [];

    for (const emp of employees) {
      if (emp.salary > 0) {
        totalAmount += emp.salary;
        entries.push({
          employeeId: emp.id,
          salary: emp.salary,
          currency: 'AC',
          status: 'CALCULATED'
        });
      }
    }

    return this.prisma.payrollRun.create({
      data: {
        companyId,
        periodStart,
        periodEnd,
        status: PayrollStatus.CALCULATED,
        totalAmount,
        entries: {
          create: entries
        }
      },
      include: { entries: true }
    });
  }

  async approvePayroll(runId: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== PayrollStatus.CALCULATED) throw new BadRequestException('Payroll must be CALCULATED to approve');

    return this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: PayrollStatus.APPROVED }
    });
  }

  async executePayrollPayment(runId: string, idempotencyKeyBase?: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: { entries: { include: { employee: { include: { acWallet: true } } } } }
    });

    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status === PayrollStatus.PAID) return run;
    if (run.status !== PayrollStatus.APPROVED) throw new BadRequestException('Payroll must be APPROVED to pay');

    const companyAcWallet = await this.prisma.aCWallet.findUnique({ where: { companyId: run.companyId } });
    if (!companyAcWallet) throw new BadRequestException('Company AC wallet not found');

    if (companyAcWallet.balance < run.totalAmount) {
      throw new BadRequestException('Insufficient company AC funds for payroll');
    }

    let successCount = 0;
    let failureCount = 0;

    for (const entry of run.entries) {
      if (entry.status !== 'PAID' && entry.employee.acWallet) {
        const idempKey = idempotencyKeyBase ? `${idempotencyKeyBase}-${entry.id}` : undefined;
        try {
          await this.economyService.transferAC(
            companyAcWallet.id,
            entry.employee.acWallet.id,
            entry.salary,
            `Payroll for period ${run.periodStart.toISOString()}`,
            idempKey
          );

          await this.prisma.payrollEntry.update({
            where: { id: entry.id },
            data: { status: 'PAID', paidAt: new Date() }
          });
          successCount++;
        } catch (e) {
          console.error(`Failed to pay employee ${entry.employeeId}:`, e);
          
          await this.prisma.payrollEntry.update({
            where: { id: entry.id },
            data: { status: 'FAILED' }
          });
          failureCount++;
        }
      } else if (entry.status === 'PAID') {
        successCount++;
      }
    }

    let finalStatus: PayrollStatus = PayrollStatus.PAID;
    if (failureCount > 0) {
      finalStatus = successCount > 0 ? PayrollStatus.PARTIALLY_PAID : PayrollStatus.FAILED;
    }

    return this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: finalStatus }
    });
  }
}
