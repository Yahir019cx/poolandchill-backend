import { Injectable, BadRequestException } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../config/database.config';

@Injectable()
export class PropertiesReadService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getMyProperties(
    userId: string,
    status?: number,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const pool = await this.databaseService.getConnection();
    const request = pool.request();

    request.input('ID_Owner', sql.UniqueIdentifier, userId);
    request.input('ID_Status', sql.TinyInt, status || null);
    request.input('PageNumber', sql.Int, page);
    request.input('PageSize', sql.Int, pageSize);

    const result = await request.execute('[property].[xsp_GetOwnerProperties]');

    const recordsets = result.recordsets as any[];
    const totalCount = recordsets[0]?.[0]?.TotalCount || 0;
    const properties = recordsets[1] || [];

    return {
      success: true,
      data: {
        totalCount,
        page,
        pageSize,
        properties: properties.map((p: any) => ({
          propertyId: p.ID_Property,
          propertyName: p.PropertyName,
          description: p.Description || null,
          hasPool: Boolean(p.HasPool),
          hasCabin: Boolean(p.HasCabin),
          hasCamping: Boolean(p.HasCamping),
          currentStep: p.CurrentStep ?? 0,
          status: {
            id: p.ID_Status,
            name: p.StatusName,
            code: p.StatusCode || null,
          },
          priceFrom: p.PriceFrom ?? 0,
          images: p.Images
            ? JSON.parse(p.Images).map((img: any) => ({
                imageUrl: img.ImageURL,
                isPrimary: Boolean(img.IsPrimary),
                displayOrder: img.DisplayOrder ?? 0,
              }))
            : [],
          location: {
            formattedAddress: p.FormattedAddress || null,
            city: p.CityName || null,
            state: p.StateName || null,
          },
          createdAt: p.CreatedAt,
          updatedAt: p.UpdatedAt || null,
          submittedAt: p.SubmittedAt || null,
        })),
      },
    };
  }

  async getPropertyById(propertyId: string, idOwner?: string | null) {
    const pool = await this.databaseService.getConnection();
    const request = pool.request();

    request.input('ID_Property', sql.UniqueIdentifier, propertyId);
    request.input('ID_Owner', sql.UniqueIdentifier, idOwner ?? null);

    const result = await request.execute('[property].[xsp_GetPropertyByID]');
    const recordsets = result.recordsets as any[];

    const firstRow = recordsets[0]?.[0];
    if (firstRow?.Code === -1) {
      throw new BadRequestException(firstRow.Message || 'Propiedad no encontrada.');
    }

    const prop = recordsets[0]?.[0];
    if (!prop) {
      throw new BadRequestException('Propiedad no encontrada.');
    }

    const property = {
      idProperty: prop.ID_Property,
      idOwner: prop.ID_Owner,
      propertyName: prop.PropertyName,
      description: prop.Description ?? null,
      hasPool: Boolean(prop.HasPool),
      hasCabin: Boolean(prop.HasCabin),
      hasCamping: Boolean(prop.HasCamping),
      currentStep: prop.CurrentStep ?? 0,
      status: {
        idStatus: prop.ID_Status,
        statusName: prop.StatusName,
        statusCode: prop.StatusCode ?? null,
      },
      createdAt: prop.CreatedAt,
      updatedAt: prop.UpdatedAt ?? null,
      submittedAt: prop.SubmittedAt ?? null,
      approvedAt: prop.ApprovedAt ?? null,
      location: {
        street: prop.Street ?? null,
        exteriorNumber: prop.ExteriorNumber ?? null,
        interiorNumber: prop.InteriorNumber ?? null,
        neighborhood: prop.Neighborhood ?? null,
        zipCode: prop.ZipCode ?? null,
        idState: prop.ID_State ?? null,
        stateName: prop.StateName ?? null,
        idCity: prop.ID_City ?? null,
        cityName: prop.CityName ?? null,
        latitude: prop.Latitude ?? null,
        longitude: prop.Longitude ?? null,
        formattedAddress: prop.FormattedAddress ?? null,
      },
    };

    const poolRows = recordsets[1] || [];
    const pools = this.groupPoolAmenities(poolRows);

    const cabinRows = recordsets[2] || [];
    const cabins = this.groupCabinAmenities(cabinRows);

    const campingRows = recordsets[3] || [];
    const campingAreas = this.groupCampingAmenities(campingRows);

    const rules = (recordsets[4] || []).map((r: any) => ({
      idPropertyRule: r.ID_PropertyRule,
      ruleText: r.RuleText,
      displayOrder: r.DisplayOrder ?? 0,
    }));

    const images = (recordsets[5] || []).map((img: any) => ({
      idPropertyImage: img.ID_PropertyImage,
      imageURL: img.ImageURL,
      isPrimary: Boolean(img.IsPrimary),
      displayOrder: img.DisplayOrder ?? 0,
    }));

    return {
      success: true,
      data: {
        property,
        pools,
        cabins,
        campingAreas,
        rules,
        images,
      },
    };
  }

  private groupPoolAmenities(rows: any[]): any[] {
    const byId = new Map<string, any>();
    for (const r of rows) {
      const id = r.ID_Pool;
      if (!id) continue;
      if (!byId.has(id)) {
        byId.set(id, {
          idPool: r.ID_Pool,
          idProperty: r.ID_Property,
          maxPersons: r.MaxPersons ?? null,
          temperatureMin: r.TemperatureMin ?? null,
          temperatureMax: r.TemperatureMax ?? null,
          checkInTime: r.CheckInTime ?? null,
          checkOutTime: r.CheckOutTime ?? null,
          priceWeekday: r.PriceWeekday ?? null,
          priceWeekend: r.PriceWeekend ?? null,
          securityDeposit: r.SecurityDeposit ?? null,
          amenities: [],
        });
      }
      if (r.AmenityName) {
        byId.get(id).amenities.push({
          amenityName: r.AmenityName,
          amenityCode: r.AmenityCode,
          icon: r.Icon ?? null,
          quantity: r.Quantity ?? 1,
        });
      }
    }
    return Array.from(byId.values());
  }

  private groupCabinAmenities(rows: any[]): any[] {
    const byId = new Map<string, any>();
    for (const r of rows) {
      const id = r.ID_Cabin;
      if (!id) continue;
      if (!byId.has(id)) {
        byId.set(id, {
          idCabin: r.ID_Cabin,
          idProperty: r.ID_Property,
          maxGuests: r.MaxGuests ?? null,
          bedrooms: r.Bedrooms ?? null,
          singleBeds: r.SingleBeds ?? null,
          doubleBeds: r.DoubleBeds ?? null,
          fullBathrooms: r.FullBathrooms ?? null,
          halfBathrooms: r.HalfBathrooms ?? null,
          checkInTime: r.CheckInTime ?? null,
          checkOutTime: r.CheckOutTime ?? null,
          minNights: r.MinNights ?? null,
          maxNights: r.MaxNights ?? null,
          priceWeekday: r.PriceWeekday ?? null,
          priceWeekend: r.PriceWeekend ?? null,
          securityDeposit: r.SecurityDeposit ?? null,
          amenities: [],
        });
      }
      if (r.AmenityName) {
        byId.get(id).amenities.push({
          amenityName: r.AmenityName,
          amenityCode: r.AmenityCode,
          icon: r.Icon ?? null,
          quantity: r.Quantity ?? 1,
        });
      }
    }
    return Array.from(byId.values());
  }

  private groupCampingAmenities(rows: any[]): any[] {
    const byId = new Map<string, any>();
    for (const r of rows) {
      const id = r.ID_CampingArea;
      if (!id) continue;
      if (!byId.has(id)) {
        byId.set(id, {
          idCampingArea: r.ID_CampingArea,
          idProperty: r.ID_Property,
          maxPersons: r.MaxPersons ?? null,
          areaSquareMeters: r.AreaSquareMeters ?? null,
          approxTents: r.ApproxTents ?? null,
          checkInTime: r.CheckInTime ?? null,
          checkOutTime: r.CheckOutTime ?? null,
          minNights: r.MinNights ?? null,
          maxNights: r.MaxNights ?? null,
          priceWeekday: r.PriceWeekday ?? null,
          priceWeekend: r.PriceWeekend ?? null,
          securityDeposit: r.SecurityDeposit ?? null,
          amenities: [],
        });
      }
      if (r.AmenityName) {
        byId.get(id).amenities.push({
          amenityName: r.AmenityName,
          amenityCode: r.AmenityCode,
          icon: r.Icon ?? null,
          quantity: r.Quantity ?? 1,
        });
      }
    }
    return Array.from(byId.values());
  }
}
