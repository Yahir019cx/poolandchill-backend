import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

/**
 * Módulo de booking / reservaciones
 *
 * Endpoints públicos (sin autenticación):
 * - POST /booking/calendar - Calendario de disponibilidad y precios
 */
@Module({
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
