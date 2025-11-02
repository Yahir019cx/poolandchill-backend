import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { GraphMailService } from '../graph-mail.service';
import { EncryptionService } from '../utils/encryption.service';

@Module({
  controllers: [ContactController],
  providers: [ContactService, GraphMailService, EncryptionService],
})
export class ContactModule {}
