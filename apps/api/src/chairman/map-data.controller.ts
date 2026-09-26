import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../authorization/jwt-auth.guard';
import { RolesGuard } from '../authorization/roles.guard';
import { Roles } from '../authorization/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { buildPins } from './map-data';

const LEAD_FIELDS = { id: true, name: true, status: true, industry: true, geography: true, metadata: true } as const;

@Controller('map')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CHAIRMAN')
export class MapDataController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('pins')
  async pins(@Request() req) {
    const companyId = req.user.companyId;
    const [leads, projects] = await Promise.all([
      this.prisma.salesLead.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: 500, select: LEAD_FIELDS }),
      this.prisma.clientProject.findMany({
        where: { companyId },
        orderBy: { createdAt: 'asc' }, // later projects overwrite earlier ones for the same business
        take: 500,
        select: { id: true, status: true, quotedAmount: true, lead: { select: LEAD_FIELDS } },
      }),
    ]);
    return buildPins(leads, projects);
  }
}
