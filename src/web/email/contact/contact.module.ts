import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { GraphMailService } from '../graph-mail.service';

@Module({
  controllers: [ContactController],
  providers: [ContactService, GraphMailService],
})
export class ContactModule {}
