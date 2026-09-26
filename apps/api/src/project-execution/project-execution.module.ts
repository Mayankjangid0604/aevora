import { Module } from '@nestjs/common';
import { ProjectExecutionController } from './project-execution.controller';
import { ProjectExecutionService } from './project-execution.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TaskModule } from '../task/task.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [PrismaModule, TaskModule, KnowledgeModule],
  controllers: [ProjectExecutionController],
  providers: [ProjectExecutionService],
  exports: [ProjectExecutionService],
})
export class ProjectExecutionModule {}
