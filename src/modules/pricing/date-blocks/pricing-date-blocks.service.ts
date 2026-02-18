import { Injectable, BadRequestException } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../config/database.config';
import {
  CreateOwnerDateBlockDto,
  DeleteOwnerDateBlockDto,
} from '../dto';

@Injectable()
export class PricingDateBlocksService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Crea bloqueos de fechas por el propietario (mantenimiento, uso personal, etc.).
   * Solo el propietario puede crear. No permite bloquear fechas con reservas confirmadas.
   */
  async createOwnerDateBlock(userId: string, dto: CreateOwnerDateBlockDto) {
    const result = await this.databaseService.executeStoredProcedure(
      '[pricing].[xsp_CreateOwnerDateBlock]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: dto.idProperty },
        { name: 'PropertyType', type: sql.VarChar(20), value: dto.propertyType },
        { name: 'StartDate', type: sql.Date, value: dto.startDate },
        { name: 'EndDate', type: sql.Date, value: dto.endDate },
        { name: 'Reason', type: sql.VarChar(50), value: dto.reason },
        { name: 'Notes', type: sql.NVarChar(500), value: dto.notes ?? null },
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
        datesBlocked: row.DatesBlocked != null ? Number(row.DatesBlocked) : 0,
        startDate: formatDate(row.StartDate),
        endDate: formatDate(row.EndDate),
        totalDays: row.TotalDays != null ? Number(row.TotalDays) : null,
        reason: row.Reason ?? dto.reason,
      },
      message: row.Message ?? 'Día(s) bloqueado(s) exitosamente',
    };
  }

  /**
   * Elimina bloqueos de fechas del propietario en el rango indicado.
   */
  async deleteOwnerDateBlock(userId: string, dto: DeleteOwnerDateBlockDto) {
    const result = await this.databaseService.executeStoredProcedure(
      '[pricing].[xsp_DeleteOwnerDateBlock]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: dto.idProperty },
        { name: 'PropertyType', type: sql.VarChar(20), value: dto.propertyType },
        { name: 'StartDate', type: sql.Date, value: dto.startDate },
        { name: 'EndDate', type: sql.Date, value: dto.endDate },
        { name: 'DeletedBy', type: sql.UniqueIdentifier, value: userId },
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

    const datesUnblocked = row.DatesUnblocked != null ? Number(row.DatesUnblocked) : 0;

    return {
      success: true,
      data: {
        datesUnblocked,
        startDate: formatDate(row.StartDate),
        endDate: formatDate(row.EndDate),
      },
      message: row.Message ?? (datesUnblocked > 0 ? 'Día(s) desbloqueado(s) exitosamente' : 'No se encontraron bloqueos en ese rango'),
    };
  }
}

function formatDate(d: Date | string | null | undefined): string | null {
  if (d == null) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().split('T')[0];
}
