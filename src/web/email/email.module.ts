import { Module } from '@nestjs/common';
import { ZohoMailService } from './zoho-mail.service';

@Module({
  providers: [ZohoMailService],
  exports: [ZohoMailService],
})
export class EmailModule {}
