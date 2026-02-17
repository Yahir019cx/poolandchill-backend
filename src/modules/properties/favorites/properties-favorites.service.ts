import { Injectable, BadRequestException } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../config/database.config';
import { mapPropertyToCard } from '../shared/property-card.mapper';

@Injectable()
export class PropertiesFavoritesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async addFavorite(userId: string, propertyId: string) {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_AddFavorite]',
      [
        { name: 'UserId', type: sql.UniqueIdentifier, value: userId },
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode === 1) {
      throw new BadRequestException(ResultMessage || 'La propiedad no existe o no está publicada.');
    }
    if (ResultCode === 2) {
      throw new BadRequestException(ResultMessage || 'La propiedad ya está en favoritos.');
    }

    return {
      success: true,
      message: 'Agregado a favoritos',
    };
  }

  async removeFavorite(userId: string, propertyId: string) {
    await this.databaseService.executeStoredProcedure(
      '[property].[xsp_RemoveFavorite]',
      [
        { name: 'UserId', type: sql.UniqueIdentifier, value: userId },
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
      ],
      [],
    );

    return {
      success: true,
      message: 'Eliminado de favoritos',
    };
  }

  async getUserFavorites(userId: string) {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_GetUserFavorites]',
      [{ name: 'UserId', type: sql.UniqueIdentifier, value: userId }],
      [],
    );

    const properties = result.recordset || [];

    return {
      success: true,
      data: {
        properties: properties.map((p: any) => mapPropertyToCard(p)),
      },
    };
  }

  async getUserFavoriteIds(userId: string) {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_GetUserFavoriteIds]',
      [{ name: 'UserId', type: sql.UniqueIdentifier, value: userId }],
      [],
    );

    const rows = result.recordset || [];
    const propertyIds = rows.map((r: any) => r.ID_Property);

    return {
      success: true,
      data: { propertyIds },
    };
  }
}
