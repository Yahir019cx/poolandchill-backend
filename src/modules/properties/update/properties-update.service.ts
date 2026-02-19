import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../config/database.config';
import {
  UpdateBasicInfoDto,
  UpdatePoolAmenitiesDto,
  UpdateCabinAmenitiesDto,
  UpdateCampingAmenitiesDto,
  UpdateRulesDto,
  AddPropertyImageDto,
  DeletePropertyImageDto,
} from '../dto/update-property.dto';

const RESULT_CODE_FORBIDDEN = -10;

@Injectable()
export class PropertiesUpdateService {
  private readonly logger = new Logger(PropertiesUpdateService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Evalúa ResultCode del SP: -10 → Forbidden, otro !== 0 → BadRequest.
   */
  private handleResultCode(ResultCode: number, ResultMessage: string, context: string): void {
    if (ResultCode === 0) return;
    if (ResultCode === RESULT_CODE_FORBIDDEN) {
      throw new ForbiddenException(ResultMessage || 'No autorizado');
    }
    throw new BadRequestException(ResultMessage || `Error en ${context}`);
  }

  private parseTime(timeStr: string | undefined): Date | null {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(1970, 0, 1, hours, minutes, 0);
  }

  async updateBasicInfo(
    userId: string,
    propertyId: string,
    data: UpdateBasicInfoDto,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_UpdatePropertyBasicInfo]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'ID_Owner', type: sql.UniqueIdentifier, value: userId },
        { name: 'Description', type: sql.NVarChar(2000), value: data.description ?? null },
        { name: 'Pool_CheckInTime', type: sql.Time, value: this.parseTime(data.pool?.checkInTime) },
        { name: 'Pool_CheckOutTime', type: sql.Time, value: this.parseTime(data.pool?.checkOutTime) },
        { name: 'Pool_PriceWeekday', type: sql.Decimal(10, 2), value: data.pool?.priceWeekday ?? null },
        { name: 'Pool_PriceWeekend', type: sql.Decimal(10, 2), value: data.pool?.priceWeekend ?? null },
        { name: 'Cabin_CheckInTime', type: sql.Time, value: this.parseTime(data.cabin?.checkInTime) },
        { name: 'Cabin_CheckOutTime', type: sql.Time, value: this.parseTime(data.cabin?.checkOutTime) },
        { name: 'Cabin_MinNights', type: sql.TinyInt, value: data.cabin?.minNights ?? null },
        { name: 'Cabin_MaxNights', type: sql.TinyInt, value: data.cabin?.maxNights ?? null },
        { name: 'Cabin_PriceWeekday', type: sql.Decimal(10, 2), value: data.cabin?.priceWeekday ?? null },
        { name: 'Cabin_PriceWeekend', type: sql.Decimal(10, 2), value: data.cabin?.priceWeekend ?? null },
        { name: 'Camping_CheckInTime', type: sql.Time, value: this.parseTime(data.camping?.checkInTime) },
        { name: 'Camping_CheckOutTime', type: sql.Time, value: this.parseTime(data.camping?.checkOutTime) },
        { name: 'Camping_MinNights', type: sql.TinyInt, value: data.camping?.minNights ?? null },
        { name: 'Camping_MaxNights', type: sql.TinyInt, value: data.camping?.maxNights ?? null },
        { name: 'Camping_PriceWeekday', type: sql.Decimal(10, 2), value: data.camping?.priceWeekday ?? null },
        { name: 'Camping_PriceWeekend', type: sql.Decimal(10, 2), value: data.camping?.priceWeekend ?? null },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;
    this.handleResultCode(ResultCode, ResultMessage, 'actualizar información básica');

    return { success: true, message: 'Información básica actualizada' };
  }

  async updatePoolAmenities(userId: string, dto: UpdatePoolAmenitiesDto): Promise<{ success: boolean; message: string }> {
    const amenitiesJson = dto.items != null ? JSON.stringify(dto.items) : null;
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_UpdatePoolAmenities]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: dto.propertyId },
        { name: 'ID_Owner', type: sql.UniqueIdentifier, value: userId },
        { name: 'MaxPersons', type: sql.SmallInt, value: dto.maxPersons },
        { name: 'TemperatureMin', type: sql.Decimal(4, 1), value: dto.temperatureMin ?? null },
        { name: 'TemperatureMax', type: sql.Decimal(4, 1), value: dto.temperatureMax ?? null },
        { name: 'AmenitiesJSON', type: sql.NVarChar(sql.MAX), value: amenitiesJson },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;
    this.handleResultCode(ResultCode, ResultMessage, 'actualizar amenidades de alberca');

    return { success: true, message: 'Amenidades de alberca actualizadas' };
  }

  async updateCabinAmenities(userId: string, dto: UpdateCabinAmenitiesDto): Promise<{ success: boolean; message: string }> {
    const amenitiesJson = dto.items != null ? JSON.stringify(dto.items) : null;
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_UpdateCabinAmenities]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: dto.propertyId },
        { name: 'ID_Owner', type: sql.UniqueIdentifier, value: userId },
        { name: 'MaxGuests', type: sql.SmallInt, value: dto.maxGuests },
        { name: 'Bedrooms', type: sql.TinyInt, value: dto.bedrooms },
        { name: 'SingleBeds', type: sql.TinyInt, value: dto.singleBeds },
        { name: 'DoubleBeds', type: sql.TinyInt, value: dto.doubleBeds },
        { name: 'FullBathrooms', type: sql.TinyInt, value: dto.fullBathrooms },
        { name: 'HalfBathrooms', type: sql.TinyInt, value: dto.halfBathrooms ?? 0 },
        { name: 'AmenitiesJSON', type: sql.NVarChar(sql.MAX), value: amenitiesJson },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;
    this.handleResultCode(ResultCode, ResultMessage, 'actualizar amenidades de cabaña');

    return { success: true, message: 'Amenidades de cabaña actualizadas' };
  }

  async updateCampingAmenities(userId: string, dto: UpdateCampingAmenitiesDto): Promise<{ success: boolean; message: string }> {
    const amenitiesJson = dto.items != null ? JSON.stringify(dto.items) : null;
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_UpdateCampingAmenities]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: dto.propertyId },
        { name: 'ID_Owner', type: sql.UniqueIdentifier, value: userId },
        { name: 'MaxPersons', type: sql.SmallInt, value: dto.maxPersons },
        { name: 'AreaSquareMeters', type: sql.Decimal(8, 2), value: dto.areaSquareMeters },
        { name: 'ApproxTents', type: sql.TinyInt, value: dto.approxTents },
        { name: 'AmenitiesJSON', type: sql.NVarChar(sql.MAX), value: amenitiesJson },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;
    this.handleResultCode(ResultCode, ResultMessage, 'actualizar amenidades de camping');

    return { success: true, message: 'Amenidades de camping actualizadas' };
  }

  async updateRules(userId: string, dto: UpdateRulesDto): Promise<{ success: boolean; message: string }> {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_UpdatePropertyRules]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: dto.propertyId },
        { name: 'ID_Owner', type: sql.UniqueIdentifier, value: userId },
        { name: 'RulesJSON', type: sql.NVarChar(sql.MAX), value: JSON.stringify(dto.rules) },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;
    this.handleResultCode(ResultCode, ResultMessage, 'actualizar reglas');

    return { success: true, message: 'Reglas actualizadas' };
  }

  async addImage(
    userId: string,
    dto: AddPropertyImageDto,
  ): Promise<{ success: boolean; idPropertyImage: string }> {
    const result = await this.databaseService.executeStoredProcedure(
      '[media].[xsp_AddPropertyImage]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: dto.propertyId },
        { name: 'ID_Owner', type: sql.UniqueIdentifier, value: userId },
        { name: 'ImageURL', type: sql.NVarChar(2000), value: dto.imageUrl },
        { name: 'IsPrimary', type: sql.Bit, value: dto.isPrimary },
      ],
      [
        { name: 'ID_PropertyImage', type: sql.UniqueIdentifier },
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ID_PropertyImage, ResultCode, ResultMessage } = result.output;
    this.handleResultCode(ResultCode, ResultMessage, 'agregar imagen');

    return {
      success: true,
      idPropertyImage: ID_PropertyImage,
    };
  }

  async deleteImage(userId: string, dto: DeletePropertyImageDto): Promise<{ success: boolean; message: string }> {
    const result = await this.databaseService.executeStoredProcedure(
      '[media].[xsp_DeletePropertyImage]',
      [
        { name: 'ID_PropertyImage', type: sql.UniqueIdentifier, value: dto.propertyImageId },
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: dto.propertyId },
        { name: 'ID_Owner', type: sql.UniqueIdentifier, value: userId },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;
    this.handleResultCode(ResultCode, ResultMessage, 'eliminar imagen');

    return { success: true, message: 'Imagen eliminada' };
  }
}
