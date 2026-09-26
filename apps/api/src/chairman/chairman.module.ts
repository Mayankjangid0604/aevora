import { MapDataController } from './map-data.controller';
import { Module } from '@nestjs/common';
import { ChairmanController } from './chairman.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EconomyModule } from '../economy/economy.module';
import { SimulationModule } from '../simulation/simulation.module';
import { CompanyOperationsModule } from '../company-operations/company-operations.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CommunicationModule } from '../communication/communication.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [
    PrismaModule,
    EconomyModule,
    SimulationModule,
    CompanyOperationsModule,
    AuthorizationModule,
    CommunicationModule,
    KnowledgeModule,
  ],
  controllers: [ChairmanController, MapDataController],
})
export class ChairmanModule {}
