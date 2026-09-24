import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { MeetingService } from './meeting.service';
import { NotificationService } from './notification.service';
import { RelationshipService } from './relationship.service';
import { CommunicationMemoryService } from './communication-memory.service';
import { SimulationModule } from '../simulation/simulation.module';

@Module({
  imports: [PrismaModule, forwardRef(() => SimulationModule)],
  providers: [
    ConversationService,
    MessageService,
    MeetingService,
    NotificationService,
    RelationshipService,
    CommunicationMemoryService,
  ],
  exports: [
    ConversationService,
    MessageService,
    MeetingService,
    NotificationService,
    RelationshipService,
    CommunicationMemoryService,
  ],
})
export class CommunicationModule {}
