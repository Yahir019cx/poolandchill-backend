import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingEmailService } from './booking-email.service';
import { EmailModule } from '../../web/email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [BookingController],
  providers: [BookingService, BookingEmailService],
  exports: [BookingService, BookingEmailService],
})
export class BookingModule {}
