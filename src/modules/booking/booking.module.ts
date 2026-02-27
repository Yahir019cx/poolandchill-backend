import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingAvailabilityController } from './booking-availability.controller';
import { BookingFlowController } from './booking-flow.controller';
import { BookingCancelController } from './booking-cancel.controller';
import { BookingReviewsController } from './booking-reviews.controller';
import { BookingService } from './booking.service';
import { BookingEmailService } from './booking-email.service';
import { EmailModule } from '../../web/email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [
    BookingController,
    BookingAvailabilityController,
    BookingFlowController,
    BookingCancelController,
    BookingReviewsController,
  ],
  providers: [BookingService, BookingEmailService],
  exports: [BookingService, BookingEmailService],
})
export class BookingModule {}
