import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContactModule } from './web/email/contact/contact.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ContactModule,
  ],
})
export class AppModule {}
