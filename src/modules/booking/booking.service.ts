import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../config/database.config';
import { GetCalendarDto } from './dto/get-calendar.dto';

interface CacheEntry {
  data: any;
  expiry: number;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Obtiene el calendario de disponibilidad de una propiedad.
   * El SP calcula internamente: mañana + 90 días.
   * Endpoint público, cache 5 min.
   */
  async getAvailabilityCalendar(dto: GetCalendarDto) {
    const cacheKey = `calendar:${dto.propertyId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.databaseService.executeStoredProcedure(
        '[pricing].[xsp_GetAvailabilityCalendar]',
        [{ name: 'ID_Property', type: sql.UniqueIdentifier, value: dto.propertyId }],
        [],
      );

      const recordset = result.recordset || [];

      // Si el SP retorna ErrorMessage, lanzar error
      const firstRow = recordset[0];
      if (firstRow?.ErrorMessage) {
        throw new NotFoundException(firstRow.ErrorMessage);
      }

      const calendar = recordset.map((row: any) => ({
        date: this.formatDate(row.Date),
        availabilityStatus: this.toCamelCaseValue(row.AvailabilityStatus),
        blockReason: row.BlockReason ?? null,
        price: row.Price != null ? Number(row.Price) : null,
        priceSource: this.toCamelCaseValue(row.PriceSource),
        specialRateReason: row.SpecialRateReason ?? null,
        dayName: row.DayName ?? null,
        dayOfWeek: row.DayOfWeek != null ? Number(row.DayOfWeek) : null,
      }));

      const response = {
        success: true,
        data: {
          propertyId: dto.propertyId,
          calendar,
        },
      };

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error en SP xsp_GetAvailabilityCalendar: ${error.message}`);
      throw new InternalServerErrorException('Error al obtener el calendario de disponibilidad');
    }
  }

  private formatDate(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString().split('T')[0];
  }

  private toCamelCaseValue(val: string | null | undefined): string | null {
    if (val == null) return null;
    return val
      .split('_')
      .map((part, i) =>
        i === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
      )
      .join('');
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiry) {
      if (entry) this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL_MS,
    });
  }
}
