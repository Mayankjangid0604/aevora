import {
  Injectable, ForbiddenException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ManagementAuditService } from './management-audit.service';
import { EmployeeStatus, KpiPeriod, KpiTrend, KpiStatus } from '@prisma/client';

@Injectable()
export class CompanyKpiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: ManagementAuditService,
  ) {}

  private async verifyActor(actorId: string, companyId: string) {
    const actor = await this.prisma.employee.findUnique({ where: { id: actorId } });
    if (!actor || actor.companyId !== companyId) throw new ForbiddenException('Actor does not belong to company');
    if (actor.status !== EmployeeStatus.ACTIVE) throw new ForbiddenException('Actor is not active');
    return actor;
  }

  async createKPI(companyId: string, actorId: string, dto: {
    name: string;
    description?: string;
    ownerId: string;
    objectiveId?: string;
    period?: KpiPeriod;
    baseline: number;
    target: number;
    unit?: string;
    sourceSystem?: string;
    sourceRef?: string;
  }) {
    await this.verifyActor(actorId, companyId);
    if (!Number.isInteger(dto.baseline) || !Number.isInteger(dto.target)) throw new BadRequestException('baseline and target must be integers');

    const owner = await this.prisma.employee.findUnique({ where: { id: dto.ownerId } });
    if (!owner || owner.companyId !== companyId) throw new NotFoundException('KPI owner not found');

    if (dto.objectiveId) {
      const obj = await this.prisma.companyObjective.findUnique({ where: { id: dto.objectiveId } });
      if (!obj || obj.companyId !== companyId) throw new NotFoundException('Objective not found');
    }

    const kpi = await this.prisma.companyKPI.create({
      data: {
        companyId, name: dto.name, description: dto.description,
        ownerId: dto.ownerId, objectiveId: dto.objectiveId,
        period: dto.period ?? KpiPeriod.MONTHLY,
        baseline: dto.baseline, target: dto.target,
        currentValue: dto.baseline, // starts at baseline
        unit: dto.unit, sourceSystem: dto.sourceSystem, sourceRef: dto.sourceRef,
        isAdvisory: true, // new KPIs are advisory until updated by authoritative source
        generatedBy: actorId,
      },
    });

    await this.audit.record({ companyId, actorId, action: 'KPI_CREATED', objectType: 'CompanyKPI', objectId: kpi.id, newValue: { name: kpi.name, target: kpi.target } });
    return kpi;
  }

  async updateKPIValue(companyId: string, actorId: string, kpiId: string, currentValue: number, isAdvisory = true) {
    await this.verifyActor(actorId, companyId);
    if (!Number.isInteger(currentValue)) throw new BadRequestException('currentValue must be integer');

    const kpi = await this.prisma.companyKPI.findUnique({ where: { id: kpiId } });
    if (!kpi || kpi.companyId !== companyId) throw new NotFoundException('KPI not found');

    // Compute trend
    let trend: KpiTrend = KpiTrend.STABLE;
    if (currentValue > kpi.currentValue) trend = KpiTrend.IMPROVING;
    else if (currentValue < kpi.currentValue) trend = KpiTrend.DECLINING;

    // Compute status
    let status: KpiStatus = KpiStatus.ON_TRACK;
    if (kpi.target > 0) {
      const pct = (currentValue / kpi.target) * 100;
      if (pct >= 100) status = KpiStatus.EXCEEDED;
      else if (pct >= 80) status = KpiStatus.ON_TRACK;
      else if (pct >= 60) status = KpiStatus.AT_RISK;
      else status = KpiStatus.MISSED;
    }

    const updated = await this.prisma.companyKPI.update({
      where: { id: kpiId },
      data: { currentValue, trend, status, isAdvisory, generatedBy: actorId },
    });

    await this.audit.record({ companyId, actorId, action: 'KPI_VALUE_UPDATED', objectType: 'CompanyKPI', objectId: kpiId, oldValue: { currentValue: kpi.currentValue }, newValue: { currentValue, trend, status } });
    return updated;
  }

  async getKPIs(companyId: string, objectiveId?: string) {
    return this.prisma.companyKPI.findMany({
      where: { companyId, ...(objectiveId ? { objectiveId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getKPI(companyId: string, kpiId: string) {
    const kpi = await this.prisma.companyKPI.findUnique({ where: { id: kpiId } });
    if (!kpi || kpi.companyId !== companyId) throw new NotFoundException('KPI not found');
    return kpi;
  }
}
