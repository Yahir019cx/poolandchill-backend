import { Module } from '@nestjs/common';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { EmailModule } from '../../web/email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [InvitationController],
  providers: [InvitationService],
})
export class InvitationModule {}
