import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../config/database.config';

@Injectable()
export class CatalogsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAmenities(category?: string) {
    const result = await this.databaseService.executeStoredProcedure(
      '[catalog].[xsp_GetAmenitiesByCategory]',
      [
        { name: 'CategoryCode', type: sql.VarChar(100), value: category || null },
      ],
      [],
    );

    return {
      success: true,
      data: result.recordset || [],
    };
  }

  async getStates() {
    const result = await this.databaseService.executeStoredProcedure(
      '[catalog].[xsp_GetStates]',
      [],
      [],
    );

    return {
      success: true,
      data: result.recordset || [],
    };
  }

  async getCities(stateId: number) {
    const result = await this.databaseService.executeStoredProcedure(
      '[catalog].[xsp_GetCitiesByState]',
      [
        { name: 'ID_State', type: sql.TinyInt, value: stateId },
      ],
      [],
    );

    return {
      success: true,
      data: result.recordset || [],
    };
  }
}
