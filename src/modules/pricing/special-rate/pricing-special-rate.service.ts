import { Injectable, BadRequestException } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../config/database.config';
import { CreateSpecialRateDto } from '../dto';

@Injectable()
export class PricingSpecialRateService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Crea una tarifa especial para una propiedad (pool, cabin o camping).
   * Solo el propietario puede crear. Valida fechas, solapamientos y tipo de propiedad.
   */
  async createSpecialRate(userId: string, dto: CreateSpecialRateDto) {
    const result = await this.databaseService.executeStoredProcedure(
      '[pricing].[xsp_CreateSpecialRate]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: dto.idProperty },
        { name: 'PropertyType', type: sql.VarChar(20), value: dto.propertyType },
        { name: 'StartDate', type: sql.Date, value: dto.startDate },
        { name: 'EndDate', type: sql.Date, value: dto.endDate },
        { name: 'SpecialPrice', type: sql.Decimal(10, 2), value: dto.specialPrice },
        { name: 'Reason', type: sql.VarChar(200), value: dto.reason ?? null },
        { name: 'Description', type: sql.NVarChar(500), value: dto.description ?? null },
        { name: 'CreatedBy', type: sql.UniqueIdentifier, value: userId },
      ],
      [],
    );

    const row = result.recordset?.[0];
    if (!row) {
      throw new BadRequestException('No se recibió respuesta del servidor');
    }

    const success = Boolean(row.Success);
    const message = row.Message ?? '';

    if (!success) {
      throw new BadRequestException(message);
    }

    return {
      success: true,
      data: {
        idSpecialRate: row.ID_SpecialRate,
        startDate: formatDate(row.StartDate),
        endDate: formatDate(row.EndDate),
        specialPrice: row.SpecialPrice != null ? Number(row.SpecialPrice) : null,
        totalDays: row.TotalDays != null ? Number(row.TotalDays) : null,
      },
      message: row.Message ?? 'Tarifa especial creada exitosamente',
    };
  }

  /**
   * Desactiva una tarifa especial. Solo el propietario de la propiedad puede desactivar.
   */
  async deactivateSpecialRate(userId: string, idSpecialRate: string) {
    const result = await this.databaseService.executeStoredProcedure(
      '[pricing].[xsp_DeactivateSpecialRate]',
      [
        { name: 'ID_SpecialRate', type: sql.UniqueIdentifier, value: idSpecialRate },
        { name: 'DeactivatedBy', type: sql.UniqueIdentifier, value: userId },
      ],
      [],
    );

    const row = result.recordset?.[0];
    if (!row) {
      throw new BadRequestException('No se recibió respuesta del servidor');
    }

    const success = Boolean(row.Success);
    const message = row.Message ?? '';

    if (!success) {
      throw new BadRequestException(message);
    }

    return {
      success: true,
      data: {
        idSpecialRate: row.ID_SpecialRate,
        startDate: formatDate(row.StartDate),
        endDate: formatDate(row.EndDate),
      },
      message: row.Message ?? 'Tarifa especial desactivada exitosamente',
    };
  }
}

function formatDate(d: Date | string | null | undefined): string | null {
  if (d == null) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().split('T')[0];
}
