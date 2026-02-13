import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../config/database.config';
import { ZohoMailService } from '../../web/email/zoho-mail.service';
import { propertyInReviewTemplate } from '../../web/email/templates';
import {
  CreatePropertyDto,
  PoolAmenitiesDto,
  CabinAmenitiesDto,
  CampingAmenitiesDto,
  SearchPropertiesDto,
} from './dto';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly zohoMailService: ZohoMailService,
  ) {}

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

      // Enviar email de confirmación (fire-and-forget)
      this.getUserEmail(userId).then((email) => {
        if (!email) {
          this.logger.warn(`No se envió email de revisión: no se encontró email para usuario ${userId}`);
          return;
        }
        this.logger.log(`Enviando email de revisión a: ${email}`);
        const html = propertyInReviewTemplate(dto.basicInfo.propertyName);
        this.zohoMailService
          .sendMail(email, 'Tu propiedad está en revisión - Pool & Chill', html)
          .then(() => this.logger.log(`Email de revisión enviado a ${email}`))
          .catch((err) => this.logger.error(`Error enviando email de revisión: ${err.message}`));
      }).catch((err) => this.logger.error(`Error obteniendo email del usuario: ${err.message}`));

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
   * Obtiene el email del usuario desde la BD
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    const result = await this.databaseService.executeStoredProcedure(
      '[security].[xsp_GetUserEmail]',
      [
        { name: 'UserId', type: sql.UniqueIdentifier, value: userId },
      ],
      [
        { name: 'Email', type: sql.NVarChar(256) },
      ],
    );

    return result.output?.Email || null;
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
        { name: 'Cabin_MaxNights', type: sql.TinyInt, value: info.cabin?.maxNights ?? null },
        { name: 'Cabin_PriceWeekday', type: sql.Decimal(10, 2), value: info.cabin?.priceWeekday ?? null },
        { name: 'Cabin_PriceWeekend', type: sql.Decimal(10, 2), value: info.cabin?.priceWeekend ?? null },
        // Camping
        { name: 'Camping_CheckInTime', type: sql.Time, value: this.parseTime(info.camping?.checkInTime) },
        { name: 'Camping_CheckOutTime', type: sql.Time, value: this.parseTime(info.camping?.checkOutTime) },
        { name: 'Camping_MinNights', type: sql.TinyInt, value: info.camping?.minNights ?? null },
        { name: 'Camping_MaxNights', type: sql.TinyInt, value: info.camping?.maxNights ?? null },
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
  // BÚSQUEDA PÚBLICA
  // ══════════════════════════════════════════════════

  /**
   * Buscar propiedades con filtros (público)
   */
  async searchProperties(dto: SearchPropertiesDto) {
    // Solo enviar true al SP, si es false o undefined enviar null (no filtrar)
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
        properties: properties.map((p: any) => this.mapPropertyToCard(p)),
      },
    };
  }

  /**
   * Mapea una fila de propiedad (search/favorites) al formato de la card
   */
  private mapPropertyToCard(p: any) {
    return {
      propertyId: p.ID_Property,
      propertyName: p.PropertyName,
      hasPool: p.HasPool,
      hasCabin: p.HasCabin,
      hasCamping: p.HasCamping,
      location: p.Location,
      priceFrom: p.PriceFrom,
      images: p.Images ? JSON.parse(p.Images) : [],
      rating: p.Rating === 0 || p.Rating === null ? 'Nuevo' : p.Rating,
      reviewCount: p.ReviewCount ?? 0,
    };
  }

  // ══════════════════════════════════════════════════
  // FAVORITOS
  // ══════════════════════════════════════════════════

  /**
   * Agregar propiedad a favoritos del usuario
   */
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

  /**
   * Quitar propiedad de favoritos del usuario
   */
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

  /**
   * Listar favoritos del usuario (misma forma que search para reutilizar la card)
   */
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
        properties: properties.map((p: any) => this.mapPropertyToCard(p)),
      },
    };
  }

  /**
   * Solo IDs de favoritos (para pintar el corazón en home sin cargar la lista completa)
   */
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

  // ══════════════════════════════════════════════════
  // CONSULTAS (PRIVADAS - OWNER)
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
    const pool = await this.databaseService.getConnection();
    const request = pool.request();

    request.input('ID_Owner', sql.UniqueIdentifier, userId);
    request.input('ID_Status', sql.TinyInt, status || null);
    request.input('PageNumber', sql.Int, page);
    request.input('PageSize', sql.Int, pageSize);

    const result = await request.execute('[property].[xsp_GetOwnerProperties]');

    // El SP retorna 2 result sets: [0] = TotalCount, [1] = Properties
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

  /**
   * Obtiene toda la información de una propiedad por ID (SP xsp_GetPropertyByID).
   * Body JSON: { propertyId, idOwner? }. Si idOwner se envía, solo devuelve si la propiedad es del dueño.
   */
  async getPropertyById(propertyId: string, idOwner?: string | null) {
    const pool = await this.databaseService.getConnection();
    const request = pool.request();

    request.input('ID_Property', sql.UniqueIdentifier, propertyId);
    request.input('ID_Owner', sql.UniqueIdentifier, idOwner ?? null);

    const result = await request.execute('[property].[xsp_GetPropertyByID]');
    const recordsets = result.recordsets as any[];

    // Validación: si el SP devolvió error (Code -1)
    const firstRow = recordsets[0]?.[0];
    if (firstRow?.Code === -1) {
      throw new BadRequestException(firstRow.Message || 'Propiedad no encontrada.');
    }

    // 1. Property + Location (una fila)
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

    // 2. Pools + Amenities (agrupar por ID_Pool)
    const poolRows = recordsets[1] || [];
    const pools = this.groupPoolAmenities(poolRows);

    // 3. Cabins + Amenities
    const cabinRows = recordsets[2] || [];
    const cabins = this.groupCabinAmenities(cabinRows);

    // 4. Camping + Amenities
    const campingRows = recordsets[3] || [];
    const campingAreas = this.groupCampingAmenities(campingRows);

    // 5. Rules
    const rules = (recordsets[4] || []).map((r: any) => ({
      idPropertyRule: r.ID_PropertyRule,
      ruleText: r.RuleText,
      displayOrder: r.DisplayOrder ?? 0,
    }));

    // 6. Images
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
          maxHours: r.MaxHours ?? null,
          minHours: r.MinHours ?? null,
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
    console.log('[getAmenities] Llamado con category:', category || 'todas');
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
