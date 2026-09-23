import { forwardRef } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { SimulationEngineService } from './simulation-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [forwardRef(() => AgentModule)],
  controllers: [SimulationController],
  providers: [SimulationService, SimulationEngineService, PrismaService],
  exports: [SimulationService, SimulationEngineService],
})
export class SimulationModule {}
