import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../config/database.config';
import { SearchPropertiesDto } from '../dto';
import { mapPropertyToCard } from '../shared/property-card.mapper';

@Injectable()
export class PropertiesSearchService {
  constructor(private readonly databaseService: DatabaseService) {}

  async searchProperties(dto: SearchPropertiesDto) {
    const hasPoolValue = dto.hasPool === true ? true : null;
    const hasCabinValue = dto.hasCabin === true ? true : null;
    const hasCampingValue = dto.hasCamping === true ? true : null;

    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_SearchProperties]',
      [
        { name: 'HasPool', type: sql.Bit, value: hasPoolValue },
        { name: 'HasCabin', type: sql.Bit, value: hasCabinValue },
        { name: 'HasCamping', type: sql.Bit, value: hasCampingValue },
        { name: 'ID_State', type: sql.TinyInt, value: dto.stateId ?? null },
        { name: 'ID_City', type: sql.Int, value: dto.cityId ?? null },
        { name: 'MinPrice', type: sql.Decimal(10, 2), value: dto.minPrice ?? null },
        { name: 'MaxPrice', type: sql.Decimal(10, 2), value: dto.maxPrice ?? null },
        { name: 'SearchText', type: sql.NVarChar(100), value: dto.search ?? null },
        { name: 'SortBy', type: sql.VarChar(20), value: dto.sortBy ?? 'newest' },
        { name: 'PageNumber', type: sql.Int, value: dto.page ?? 1 },
        { name: 'PageSize', type: sql.Int, value: dto.pageSize ?? 20 },
      ],
      [],
    );

    const properties = result.recordset || [];
    const totalCount = properties[0]?.TotalCount || 0;

    return {
      success: true,
      data: {
        totalCount,
        page: dto.page ?? 1,
        pageSize: dto.pageSize ?? 20,
        properties: properties.map((p: any) => mapPropertyToCard(p)),
      },
    };
  }
}
