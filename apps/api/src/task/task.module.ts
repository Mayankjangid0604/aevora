import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { PrismaService } from '../prisma/prisma.service';

import { ResearchModule } from '../research/research.module';

@Module({
  imports: [ResearchModule],
  controllers: [TaskController],
  providers: [TaskService, PrismaService],
  exports: [TaskService],
})
export class TaskModule {}
