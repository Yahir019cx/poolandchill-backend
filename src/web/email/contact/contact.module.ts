import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ZohoMailService } from '../zoho-mail.service';
import { EncryptionService } from '../utils/encryption.service';

@Module({
  controllers: [ContactController],
  providers: [ContactService, ZohoMailService, EncryptionService],
})
export class ContactModule {}
