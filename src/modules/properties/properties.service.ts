import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../config/database.config';
import {
  CreatePropertyDto,
  PoolAmenitiesDto,
  CabinAmenitiesDto,
  CampingAmenitiesDto,
} from './dto';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Convierte string "HH:mm" a Date para sql.Time
   */
  private parseTime(timeStr: string | undefined): Date | null {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(1970, 0, 1, hours, minutes, 0);
    return date;
  }

  /**
   * Crea una propiedad completa ejecutando todos los SPs en secuencia
   */
  async createProperty(userId: string, dto: CreatePropertyDto) {
    this.logger.log(`Creando propiedad para usuario: ${userId}`);

    // Validar que al menos un servicio esté seleccionado
    if (!dto.services.hasPool && !dto.services.hasCabin && !dto.services.hasCamping) {
      throw new BadRequestException('Debe seleccionar al menos un servicio (pool, cabin o camping)');
    }

    try {
      // 1. Crear propiedad base
      const propertyId = await this.executeCreateProperty(userId, dto);

      // 2. Guardar ubicación
      await this.executeSaveLocation(propertyId, dto);

      // 3. Guardar info básica + precios
      await this.executeSaveBasicInfo(propertyId, dto);

      // 4. Guardar amenidades (según servicios seleccionados)
      if (dto.services.hasPool && dto.amenities.pool) {
        await this.executeSavePoolAmenities(propertyId, dto.amenities.pool);
      }
      if (dto.services.hasCabin && dto.amenities.cabin) {
        await this.executeSaveCabinAmenities(propertyId, dto.amenities.cabin);
      }
      if (dto.services.hasCamping && dto.amenities.camping) {
        await this.executeSaveCampingAmenities(propertyId, dto.amenities.camping);
      }

      // 5. Guardar reglas
      await this.executeSaveRules(propertyId, dto);

      // 6. Guardar imágenes
      await this.executeSaveImages(propertyId, dto);

      // 7. Enviar a revisión
      await this.executeSubmitForReview(propertyId, userId);

      this.logger.log(`Propiedad ${propertyId} creada y enviada a revisión`);

      return {
        success: true,
        message: 'Propiedad enviada a revisión',
        data: { propertyId },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error creando propiedad: ${error.message}`);
      throw new InternalServerErrorException('Error al crear la propiedad');
    }
  }

  /**
   * SP 1: Crear propiedad base
   */
  private async executeCreateProperty(userId: string, dto: CreatePropertyDto): Promise<string> {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_CreateProperty]',
      [
        { name: 'ID_Owner', type: sql.UniqueIdentifier, value: userId },
        { name: 'HasPool', type: sql.Bit, value: dto.services.hasPool },
        { name: 'HasCabin', type: sql.Bit, value: dto.services.hasCabin },
        { name: 'HasCamping', type: sql.Bit, value: dto.services.hasCamping },
      ],
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier },
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ID_Property, ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(ResultMessage || 'Error al crear la propiedad');
    }

    return ID_Property;
  }

  /**
   * SP 2: Guardar ubicación
   */
  private async executeSaveLocation(propertyId: string, dto: CreatePropertyDto): Promise<void> {
    const loc = dto.location;

    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_SavePropertyLocation]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'Street', type: sql.NVarChar(200), value: loc.street },
        { name: 'ExteriorNumber', type: sql.NVarChar(20), value: loc.exteriorNumber },
        { name: 'InteriorNumber', type: sql.NVarChar(20), value: loc.interiorNumber || null },
        { name: 'Neighborhood', type: sql.NVarChar(100), value: loc.neighborhood || null },
        { name: 'ZipCode', type: sql.VarChar(10), value: loc.zipCode },
        { name: 'ID_State', type: sql.TinyInt, value: loc.stateId },
        { name: 'ID_City', type: sql.Int, value: loc.cityId },
        { name: 'Latitude', type: sql.Decimal(10, 8), value: loc.latitude },
        { name: 'Longitude', type: sql.Decimal(11, 8), value: loc.longitude },
        { name: 'GooglePlaceID', type: sql.VarChar(100), value: loc.googlePlaceId || null },
        { name: 'FormattedAddress', type: sql.NVarChar(300), value: loc.formattedAddress || null },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(ResultMessage || 'Error al guardar la ubicación');
    }
  }

  /**
   * SP 3: Guardar info básica + precios
   */
  private async executeSaveBasicInfo(propertyId: string, dto: CreatePropertyDto): Promise<void> {
    const info = dto.basicInfo;

    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_SavePropertyBasicInfo]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'PropertyName', type: sql.NVarChar(100), value: info.propertyName },
        { name: 'Description', type: sql.NVarChar(2000), value: info.description || null },
        // Pool
        { name: 'Pool_CheckInTime', type: sql.Time, value: this.parseTime(info.pool?.checkInTime) },
        { name: 'Pool_CheckOutTime', type: sql.Time, value: this.parseTime(info.pool?.checkOutTime) },
        { name: 'Pool_MaxHours', type: sql.TinyInt, value: info.pool?.maxHours ?? null },
        { name: 'Pool_MinHours', type: sql.TinyInt, value: info.pool?.minHours ?? null },
        { name: 'Pool_PriceWeekday', type: sql.Decimal(10, 2), value: info.pool?.priceWeekday ?? null },
        { name: 'Pool_PriceWeekend', type: sql.Decimal(10, 2), value: info.pool?.priceWeekend ?? null },
        // Cabin
        { name: 'Cabin_CheckInTime', type: sql.Time, value: this.parseTime(info.cabin?.checkInTime) },
        { name: 'Cabin_CheckOutTime', type: sql.Time, value: this.parseTime(info.cabin?.checkOutTime) },
        { name: 'Cabin_MinNights', type: sql.TinyInt, value: info.cabin?.minNights ?? null },
        { name: 'Cabin_PriceWeekday', type: sql.Decimal(10, 2), value: info.cabin?.priceWeekday ?? null },
        { name: 'Cabin_PriceWeekend', type: sql.Decimal(10, 2), value: info.cabin?.priceWeekend ?? null },
        // Camping
        { name: 'Camping_CheckInTime', type: sql.Time, value: this.parseTime(info.camping?.checkInTime) },
        { name: 'Camping_CheckOutTime', type: sql.Time, value: this.parseTime(info.camping?.checkOutTime) },
        { name: 'Camping_MinNights', type: sql.TinyInt, value: info.camping?.minNights ?? null },
        { name: 'Camping_PriceWeekday', type: sql.Decimal(10, 2), value: info.camping?.priceWeekday ?? null },
        { name: 'Camping_PriceWeekend', type: sql.Decimal(10, 2), value: info.camping?.priceWeekend ?? null },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(ResultMessage || 'Error al guardar la información básica');
    }
  }

  /**
   * SP 4a: Guardar amenidades de pool
   */
  private async executeSavePoolAmenities(propertyId: string, amenities: PoolAmenitiesDto): Promise<void> {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_SavePoolAmenities]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'MaxPersons', type: sql.SmallInt, value: amenities.maxPersons },
        { name: 'TemperatureMin', type: sql.Decimal(4, 1), value: amenities.temperatureMin || null },
        { name: 'TemperatureMax', type: sql.Decimal(4, 1), value: amenities.temperatureMax || null },
        { name: 'AmenitiesJSON', type: sql.NVarChar(sql.MAX), value: JSON.stringify(amenities.items) },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(ResultMessage || 'Error al guardar amenidades de alberca');
    }
  }

  /**
   * SP 4b: Guardar amenidades de cabin
   */
  private async executeSaveCabinAmenities(propertyId: string, amenities: CabinAmenitiesDto): Promise<void> {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_SaveCabinAmenities]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'MaxGuests', type: sql.SmallInt, value: amenities.maxGuests },
        { name: 'Bedrooms', type: sql.TinyInt, value: amenities.bedrooms },
        { name: 'SingleBeds', type: sql.TinyInt, value: amenities.singleBeds },
        { name: 'DoubleBeds', type: sql.TinyInt, value: amenities.doubleBeds },
        { name: 'FullBathrooms', type: sql.TinyInt, value: amenities.fullBathrooms },
        { name: 'HalfBathrooms', type: sql.TinyInt, value: amenities.halfBathrooms || 0 },
        { name: 'AmenitiesJSON', type: sql.NVarChar(sql.MAX), value: JSON.stringify(amenities.items) },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(ResultMessage || 'Error al guardar amenidades de cabaña');
    }
  }

  /**
   * SP 4c: Guardar amenidades de camping
   */
  private async executeSaveCampingAmenities(propertyId: string, amenities: CampingAmenitiesDto): Promise<void> {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_SaveCampingAmenities]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'MaxPersons', type: sql.SmallInt, value: amenities.maxPersons },
        { name: 'AreaSquareMeters', type: sql.Decimal(8, 2), value: amenities.areaSquareMeters },
        { name: 'ApproxTents', type: sql.TinyInt, value: amenities.approxTents },
        { name: 'AmenitiesJSON', type: sql.NVarChar(sql.MAX), value: JSON.stringify(amenities.items) },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(ResultMessage || 'Error al guardar amenidades de camping');
    }
  }

  /**
   * SP 5: Guardar reglas
   */
  private async executeSaveRules(propertyId: string, dto: CreatePropertyDto): Promise<void> {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_SavePropertyRules]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'RulesJSON', type: sql.NVarChar(sql.MAX), value: JSON.stringify(dto.rules) },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(ResultMessage || 'Error al guardar las reglas');
    }
  }

  /**
   * SP 6: Guardar imágenes
   */
  private async executeSaveImages(propertyId: string, dto: CreatePropertyDto): Promise<void> {
    const result = await this.databaseService.executeStoredProcedure(
      '[media].[xsp_SavePropertyImages]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'ImagesJSON', type: sql.NVarChar(sql.MAX), value: JSON.stringify(dto.images) },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(ResultMessage || 'Error al guardar las imágenes');
    }
  }

  /**
   * SP 7: Enviar a revisión
   */
  private async executeSubmitForReview(propertyId: string, userId: string): Promise<void> {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_SubmitPropertyForReview]',
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
      throw new BadRequestException(ResultMessage || 'Error al enviar a revisión');
    }
  }

  // ══════════════════════════════════════════════════
  // CONSULTAS
  // ══════════════════════════════════════════════════

  /**
   * Obtener propiedades del owner
   */
  async getMyProperties(
    userId: string,
    status?: number,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_GetOwnerProperties]',
      [
        { name: 'ID_Owner', type: sql.UniqueIdentifier, value: userId },
        { name: 'ID_Status', type: sql.TinyInt, value: status || null },
        { name: 'PageNumber', type: sql.Int, value: page },
        { name: 'PageSize', type: sql.Int, value: pageSize },
      ],
      [],
    );

    const properties = result.recordset || [];
    const totalCount = properties[0]?.TotalCount || 0;

    return {
      success: true,
      data: {
        totalCount,
        page,
        pageSize,
        properties: properties.map((p: any) => ({
          propertyId: p.ID_Property,
          propertyName: p.PropertyName,
          status: p.ID_Status,
          statusName: p.StatusName,
          hasPool: p.HasPool,
          hasCabin: p.HasCabin,
          hasCamping: p.HasCamping,
          primaryImageUrl: p.PrimaryImageUrl,
          city: p.CityName,
          state: p.StateName,
          createdAt: p.CreatedAt,
        })),
      },
    };
  }

  /**
   * Obtener propiedad por ID
   */
  async getProperty(userId: string, propertyId: string) {
    const pool = await this.databaseService.getConnection();
    const request = pool.request();

    request.input('ID_Property', sql.UniqueIdentifier, propertyId);
    request.input('ID_Owner', sql.UniqueIdentifier, userId);

    const result = await request.execute('[property].[xsp_GetPropertyByID]');

    // El SP retorna 6 result sets
    const recordsets = result.recordsets as any[];
    const [propertyData, poolData, cabinData, campingData, rulesData, imagesData] = recordsets;

    if (!propertyData || propertyData.length === 0) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    const property = propertyData[0];

    return {
      success: true,
      data: {
        property: {
          propertyId: property.ID_Property,
          propertyName: property.PropertyName,
          description: property.Description,
          status: property.ID_Status,
          statusName: property.StatusName,
          hasPool: property.HasPool,
          hasCabin: property.HasCabin,
          hasCamping: property.HasCamping,
          createdAt: property.CreatedAt,
        },
        location: {
          street: property.Street,
          exteriorNumber: property.ExteriorNumber,
          interiorNumber: property.InteriorNumber,
          neighborhood: property.Neighborhood,
          zipCode: property.ZipCode,
          city: property.CityName,
          state: property.StateName,
          latitude: property.Latitude,
          longitude: property.Longitude,
          formattedAddress: property.FormattedAddress,
        },
        pool: poolData?.[0] || null,
        cabin: cabinData?.[0] || null,
        camping: campingData?.[0] || null,
        rules: rulesData || [],
        images: imagesData || [],
      },
    };
  }

  // ══════════════════════════════════════════════════
  // GESTIÓN DE ESTADO
  // ══════════════════════════════════════════════════

  /**
   * Cambiar estado de propiedad (pausar/reactivar)
   */
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

  /**
   * Eliminar propiedad (soft delete)
   */
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

  // ══════════════════════════════════════════════════
  // CATÁLOGOS
  // ══════════════════════════════════════════════════

  /**
   * Obtener amenidades por categoría
   */
  async getAmenities(category?: string) {
    const result = await this.databaseService.executeStoredProcedure(
      '[catalog].[xsp_GetAmenitiesByCategory]',
      [
        { name: 'CategoryCode', type: sql.VarChar(20), value: category || null },
      ],
      [],
    );

    return {
      success: true,
      data: result.recordset || [],
    };
  }

  /**
   * Obtener estados
   */
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

  /**
   * Obtener ciudades por estado
   */
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
