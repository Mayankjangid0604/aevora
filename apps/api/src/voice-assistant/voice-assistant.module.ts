import { Module } from '@nestjs/common';
import { SimulationModule } from '../simulation/simulation.module';
import { VenturesModule } from '../ventures/ventures.module';
import { VoiceCommandService } from './voice-command.service';
import { VoiceAssistantController } from './voice-assistant.controller';

@Module({
  imports: [SimulationModule, VenturesModule],
  providers: [VoiceCommandService],
  controllers: [VoiceAssistantController],
  exports: [VoiceCommandService],
})
export class VoiceAssistantModule {}
