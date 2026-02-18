import { Injectable, BadRequestException } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../config/database.config';

@Injectable()
export class PropertiesStatusService {
  constructor(private readonly databaseService: DatabaseService) {}

  async changeStatus(userId: string, propertyId: string, newStatus: number) {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_ChangePropertyStatus]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'ID_Owner', type: sql.UniqueIdentifier, value: userId },
        { name: 'NewStatus', type: sql.TinyInt, value: newStatus },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(ResultMessage || 'Error al cambiar el estado');
    }

    return {
      success: true,
      message: newStatus === 3 ? 'Propiedad reactivada' : 'Propiedad pausada',
    };
  }

  async deleteProperty(userId: string, propertyId: string) {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_DeleteProperty]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'ID_Owner', type: sql.UniqueIdentifier, value: userId },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(ResultMessage || 'Error al eliminar la propiedad');
    }

    return {
      success: true,
      message: 'Propiedad eliminada',
    };
  }
}
