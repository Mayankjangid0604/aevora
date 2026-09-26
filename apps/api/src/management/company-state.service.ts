import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeStatus, TaskStatus, ProjectStatus } from '@prisma/client';

export interface CompanyStateSnapshot {
  companyId: string;
  snapshotAt: Date;
  lifecycle: {
    status: string;
    productionState: string;
  };
  workforce: {
    totalEmployees: number;
    activeEmployees: number;
    suspendedEmployees: number;
    terminatedEmployees: number;
    departments: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    blocked: number;
  };
  tasks: {
    total: number;
    inProgress: number;
    blocked: number;
    overdue: number;
  };
  customers: {
    total: number;
    active: number;
  };
  sales: {
    totalLeads: number;
    openOpportunities: number;
    closedWon: number;
    closedLost: number;
  };
  finance: {
    acBalance: number;
    totalRevenue: number;
    openInvoices: number;
  };
  marketing: {
    activeCampaigns: number;
    scheduledContent: number;
  };
}

@Injectable()
export class CompanyStateService {
  constructor(private readonly prisma: PrismaService) {}

  async collectState(companyId: string): Promise<CompanyStateSnapshot> {
    const now = new Date();

    const [
      company,
      employeeCounts,
      deptCount,
      projectCounts,
      taskCounts,
      clientCount,
      leadCount,
      opportunityCounts,
      acWallet,
      revenueSums,
      invoiceCount,
      campaignCount,
      contentCount,
    ] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId }, select: { status: true, productionState: true } }),
      this.prisma.employee.groupBy({ by: ['status'], where: { companyId }, _count: true }),
      this.prisma.department.count({ where: { companyId } }),
      this.prisma.project.groupBy({ by: ['status'], where: { companyId }, _count: true }).catch(() => []),
      this.prisma.task.groupBy({ by: ['status'], where: { companyId }, _count: true }).catch(() => []),
      this.prisma.client.count({ where: { companyId } }),
      this.prisma.salesLead.count({ where: { companyId } }).catch(() => 0),
      this.prisma.opportunity.groupBy({ by: ['status'], where: { companyId }, _count: true }).catch(() => []),
      this.prisma.aCWallet.findUnique({ where: { companyId } }),
      this.prisma.revenueRecord.aggregate({ where: { companyId }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
      this.prisma.invoice.count({ where: { companyId, status: 'ISSUED' } }).catch(() => 0),
      this.prisma.marketingCampaign.count({ where: { companyId, status: 'ACTIVE' } }).catch(() => 0),
      this.prisma.marketingContent.count({ where: { companyId, status: 'SCHEDULED' } }).catch(() => 0),
    ]);

    const empByStatus = (status: string) =>
      (employeeCounts.find((e: any) => e.status === status)?._count ?? 0) as number;

    const projectByStatus = (status: string) =>
      ((projectCounts as any[]).find((p: any) => p.status === status)?._count ?? 0) as number;

    const taskByStatus = (status: string) =>
      ((taskCounts as any[]).find((t: any) => t.status === status)?._count ?? 0) as number;

    const oppByStatus = (status: string) =>
      ((opportunityCounts as any[]).find((o: any) => o.status === status)?._count ?? 0) as number;

    return {
      companyId,
      snapshotAt: now,
      lifecycle: {
        status: company?.status ?? 'UNKNOWN',
        productionState: company?.productionState ?? 'UNKNOWN',
      },
      workforce: {
        totalEmployees: employeeCounts.reduce((s: number, e: any) => s + e._count, 0),
        activeEmployees: empByStatus(EmployeeStatus.ACTIVE),
        suspendedEmployees: empByStatus(EmployeeStatus.SUSPENDED),
        terminatedEmployees: empByStatus(EmployeeStatus.TERMINATED),
        departments: deptCount,
      },
      projects: {
        total: (projectCounts as any[]).reduce((s, p) => s + p._count, 0),
        active: projectByStatus('ACTIVE') + projectByStatus('IN_PROGRESS'),
        completed: projectByStatus('COMPLETED'),
        blocked: projectByStatus('BLOCKED'),
      },
      tasks: {
        total: (taskCounts as any[]).reduce((s, t) => s + t._count, 0),
        inProgress: taskByStatus(TaskStatus.IN_PROGRESS),
        blocked: taskByStatus(TaskStatus.BLOCKED),
        overdue: 0, // computed separately if needed
      },
      customers: {
        total: clientCount,
        active: clientCount,
      },
      sales: {
        totalLeads: leadCount,
        openOpportunities: oppByStatus('OPEN') + oppByStatus('QUALIFYING') + oppByStatus('NEGOTIATION'),
        closedWon: oppByStatus('CLOSED_WON'),
        closedLost: oppByStatus('CLOSED_LOST'),
      },
      finance: {
        acBalance: acWallet?.balance ?? 0,
        totalRevenue: (revenueSums as any)?._sum?.amount ?? 0,
        openInvoices: invoiceCount,
      },
      marketing: {
        activeCampaigns: campaignCount,
        scheduledContent: contentCount,
      },
    };
  }
}
