import { BadRequestException, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../config/database.config';
import { SearchPropertiesDto } from '../dto';
import { mapPropertyToCard } from '../shared/property-card.mapper';

@Injectable()
export class PropertiesSearchService {
  constructor(private readonly databaseService: DatabaseService) {}

  async searchProperties(dto: SearchPropertiesDto) {
    const checkIn =
      dto.checkInDate != null ? new Date(dto.checkInDate) : null;
    const checkOut =
      dto.checkOutDate != null ? new Date(dto.checkOutDate) : null;

    if (checkIn != null && checkOut != null && checkOut <= checkIn) {
      throw new BadRequestException(
        'checkOutDate debe ser posterior a checkInDate',
      );
    }

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
        { name: 'CheckInDate', type: sql.Date, value: checkIn },
        { name: 'CheckOutDate', type: sql.Date, value: checkOut },
        { name: 'SortBy', type: sql.VarChar(20), value: dto.sortBy ?? 'newest' },
        { name: 'PageNumber', type: sql.Int, value: dto.page ?? 1 },
        { name: 'PageSize', type: sql.Int, value: dto.pageSize ?? 20 },
      ],
      [],
    );

    const properties = result.recordset || [];
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const totalCount = Number(properties[0]?.TotalCount ?? 0);
    const hasMore = page * pageSize < totalCount;

    return {
      success: true,
      data: {
        totalCount,
        page,
        pageSize,
        hasMore,
        properties: properties.map((p: any) => mapPropertyToCard(p)),
      },
    };
  }
}
