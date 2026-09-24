import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientProjectType } from '@prisma/client';
import { ModelGateway } from '@aevora/model-gateway';
import { PrismaService } from '../prisma/prisma.service';
import { ClientNeeds } from '../sales-outreach/discovery.service';

export interface ProjectScope {
  title: string;
  description: string;
  deliverables: string[];
  estimatedHours: number;
  pricePaise: number;
}

const SCOPE_SYSTEM = `You scope small fixed-price projects for a web/automation agency in India serving local businesses.
Return JSON only: {"title": string, "description": string, "deliverables": string[], "estimatedHours": number, "recommendedPriceInr": number}
Price realistically for small Indian businesses (typically INR 5,000–50,000). Respect the client's budget when given.`;

const MIN_PRICE_PAISE = 1_000_00; // ₹1,000 floor

export function projectTypeFromNeeds(n: Partial<ClientNeeds>): ClientProjectType {
  if (n.needsWebsite) return 'WEBSITE';
  if (n.needsAutomation) return 'AUTOMATION';
  if (n.needsSaaS) return 'SAAS';
  return 'WEBSITE';
}

export function normalizeScope(raw: any, budgetInr: number | null): ProjectScope {
  let priceInr = Math.round(Number(raw?.recommendedPriceInr));
  if (!Number.isFinite(priceInr) || priceInr <= 0) priceInr = budgetInr ?? 10_000;
  const hours = Math.round(Number(raw?.estimatedHours));
  return {
    title: String(raw?.title ?? 'Client project').slice(0, 200),
    description: String(raw?.description ?? ''),
    deliverables: Array.isArray(raw?.deliverables) ? raw.deliverables.map(String).slice(0, 20) : [],
    estimatedHours: Number.isFinite(hours) && hours > 0 ? hours : 8,
    pricePaise: Math.max(MIN_PRICE_PAISE, priceInr * 100),
  };
}

@Injectable()
export class ScopeService {
  private readonly gateway = new ModelGateway();

  constructor(private readonly prisma: PrismaService) {}

  async scopeProject(companyId: string, projectId: string) {
    const project = await this.prisma.clientProject.findFirst({ where: { id: projectId, companyId }, include: { lead: true } });
    if (!project) throw new NotFoundException('Client project not found');
    const needs = project.requirements as any;

    const res = await this.gateway.generate({
      systemMessage: SCOPE_SYSTEM,
      prompt: JSON.stringify({
        business: project.lead.name,
        category: project.lead.industry,
        projectType: project.projectType,
        needs,
      }),
      requireStructuredOutput: true,
      temperature: 0.2,
    });
    const scope = normalizeScope(res.structuredOutput, needs?.budget ?? null);

    return this.prisma.clientProject.update({
      where: { id: project.id },
      data: { scope: scope as any, quotedAmount: scope.pricePaise, status: 'BUILDING' },
    });
  }
}
