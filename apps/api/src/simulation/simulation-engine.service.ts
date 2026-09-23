import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentSchedulerService } from '../agent/agent-scheduler.service';
import { WorkCycleService } from '../agent/work-cycle.service';
import { SimulationStatus, EventStatus } from '@prisma/client';

@Injectable()
export class SimulationEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulationEngineService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessingTick = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AgentSchedulerService)) private readonly schedulerService: AgentSchedulerService,
    @Inject(forwardRef(() => WorkCycleService)) private readonly workCycleService: WorkCycleService,
  ) {}

  onModuleInit() {
    this.logger.log('Starting Simulation Engine background loop...');
    // We run the tick evaluation loop at a fixed real-time interval (e.g. 1000ms base)
    // The loop checks state.speedMultiplier to advance simulation time properly.
    this.intervalId = setInterval(() => this.tick(), 1000).unref();
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async tick() {
    if (this.isProcessingTick) return;
    this.isProcessingTick = true;

    try {
      const state = await this.prisma.simulationState.findFirst();
      if (!state || state.status !== SimulationStatus.RUNNING) {
        return; // Do nothing if paused or stopped
      }

      // Advance Simulation Time by 1 second * speedMultiplier
      const newSimTime = new Date(state.simulationTime.getTime() + (1000 * state.speedMultiplier));
      const newTick = state.currentTick + 1;

      // Update State atomically
      await this.prisma.simulationState.update({
        where: { id: state.id },
        data: {
          currentTick: newTick,
          simulationTime: newSimTime
        }
      });

      // Schedule new events for eligible agents
      await this.scheduleWorkCycles(newSimTime);

      // Process pending events
      await this.processEvents(newSimTime, state.id);

    } catch (err) {
      this.logger.error('Error during simulation tick:', err);
    } finally {
      this.isProcessingTick = false;
    }
  }

  private async scheduleWorkCycles(currentTime: Date) {
    const agents = await this.schedulerService.getEligibleAgents();
    
    for (const agent of agents) {
      // Check if already an event for this agent in SCHEDULED state
      const existing = await this.prisma.simulationEvent.findFirst({
        where: {
          type: 'EMPLOYEE_WORK_CYCLE',
          status: EventStatus.SCHEDULED,
          payload: { path: ['agentId'], equals: agent.id }
        }
      });

      if (!existing) {
        await this.prisma.simulationEvent.create({
          data: {
            type: 'EMPLOYEE_WORK_CYCLE',
            simulationTime: currentTime,
            priority: 10,
            payload: { agentId: agent.id }
          }
        });
      }
    }
  }

  private async processEvents(currentTime: Date, stateId: string) {
    const events = await this.prisma.simulationEvent.findMany({
      where: {
        status: EventStatus.SCHEDULED,
        simulationTime: { lte: currentTime }
      },
      orderBy: [
        { simulationTime: 'asc' },
        { priority: 'desc' },
        { id: 'asc' }
      ],
      take: 10 // process batch size per tick
    });

    for (const event of events) {
      // Optimistic lock using updateMany and status condition
      const claimed = await this.prisma.simulationEvent.updateMany({
        where: { id: event.id, status: EventStatus.SCHEDULED },
        data: { status: EventStatus.PROCESSING }
      });

      if (claimed.count === 0) continue; // Concurrency: someone else claimed it

      try {
        await this.handleEvent(event);
        
        await this.prisma.simulationEvent.update({
          where: { id: event.id },
          data: { status: EventStatus.COMPLETED, processedAt: new Date() }
        });
        
        await this.prisma.simulationState.update({ 
          where: { id: stateId }, 
          data: { processedEvents: { increment: 1 } } 
        });
      } catch (error) {
        this.logger.error(`Failed to process event ${event.id}:`, error);
        const newRetryCount = event.retryCount + 1;
        const status = newRetryCount >= 3 ? EventStatus.FAILED : EventStatus.SCHEDULED;
        
        await this.prisma.simulationEvent.update({
          where: { id: event.id },
          data: { status, retryCount: newRetryCount }
        });
        
        if (status === EventStatus.FAILED) {
          await this.prisma.simulationState.update({
            where: { id: stateId },
            data: { failedEvents: { increment: 1 } }
          });
        }
      }
    }
  }

  private async handleEvent(event: any) {
    switch (event.type) {
      case 'EMPLOYEE_WORK_CYCLE': {
        const payload = event.payload as any;
        const agentId = payload.agentId;
        // Direct method call! No HTTP needed.
        await this.workCycleService.runWorkCycle(agentId);
        break;
      }
      default:
        this.logger.warn(`Unknown event type: ${event.type}`);
    }
  }

  async dispatchCustomEvent(companyId: string, employeeId: string | null, payload: any) {
    const state = await this.prisma.simulationState.findFirst();
    if (!state) return;
    
    await this.prisma.simulationEvent.create({
      data: {
        simulationTime: state.simulationTime,
        priority: 5,
        type: payload.type || 'CUSTOM_EVENT',
        payload: {
          employeeId,
          ...payload
        }
      }
    });
  }
}
