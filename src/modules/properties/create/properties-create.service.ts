import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../config/database.config';
import { ZohoMailService } from '../../../web/email/zoho-mail.service';
import { propertyInReviewTemplate } from '../../../web/email/templates';
import {
  CreatePropertyDto,
  PoolAmenitiesDto,
  CabinAmenitiesDto,
  CampingAmenitiesDto,
} from '../dto';

@Injectable()
export class PropertiesCreateService {
  private readonly logger = new Logger(PropertiesCreateService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly zohoMailService: ZohoMailService,
  ) {}

  private parseTime(timeStr: string | undefined): Date | null {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(1970, 0, 1, hours, minutes, 0);
  }

  async createProperty(userId: string, dto: CreatePropertyDto) {
    this.logger.log(`Creando propiedad para usuario: ${userId}`);

    if (!dto.services.hasPool && !dto.services.hasCabin && !dto.services.hasCamping) {
      throw new BadRequestException('Debe seleccionar al menos un servicio (pool, cabin o camping)');
    }

    try {
      const propertyId = await this.executeCreateProperty(userId, dto);
      await this.executeSaveLocation(propertyId, dto);
      await this.executeSaveBasicInfo(propertyId, dto);

      if (dto.services.hasPool && dto.amenities.pool) {
        await this.executeSavePoolAmenities(propertyId, dto.amenities.pool);
      }
      if (dto.services.hasCabin && dto.amenities.cabin) {
        await this.executeSaveCabinAmenities(propertyId, dto.amenities.cabin);
      }
      if (dto.services.hasCamping && dto.amenities.camping) {
        await this.executeSaveCampingAmenities(propertyId, dto.amenities.camping);
      }

      await this.executeSaveRules(propertyId, dto);
      await this.executeSaveImages(propertyId, dto);
      await this.executeSubmitForReview(propertyId, userId);

      this.logger.log(`Propiedad ${propertyId} creada y enviada a revisión`);

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

  private async executeSaveBasicInfo(propertyId: string, dto: CreatePropertyDto): Promise<void> {
    const info = dto.basicInfo;
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_SavePropertyBasicInfo]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'PropertyName', type: sql.NVarChar(100), value: info.propertyName },
        { name: 'Description', type: sql.NVarChar(2000), value: info.description || null },
        { name: 'Pool_CheckInTime', type: sql.Time, value: this.parseTime(info.pool?.checkInTime) },
        { name: 'Pool_CheckOutTime', type: sql.Time, value: this.parseTime(info.pool?.checkOutTime) },
        { name: 'Pool_PriceWeekday', type: sql.Decimal(10, 2), value: info.pool?.priceWeekday ?? null },
        { name: 'Pool_PriceWeekend', type: sql.Decimal(10, 2), value: info.pool?.priceWeekend ?? null },
        { name: 'Cabin_CheckInTime', type: sql.Time, value: this.parseTime(info.cabin?.checkInTime) },
        { name: 'Cabin_CheckOutTime', type: sql.Time, value: this.parseTime(info.cabin?.checkOutTime) },
        { name: 'Cabin_MinNights', type: sql.TinyInt, value: info.cabin?.minNights ?? null },
        { name: 'Cabin_MaxNights', type: sql.TinyInt, value: info.cabin?.maxNights ?? null },
        { name: 'Cabin_PriceWeekday', type: sql.Decimal(10, 2), value: info.cabin?.priceWeekday ?? null },
        { name: 'Cabin_PriceWeekend', type: sql.Decimal(10, 2), value: info.cabin?.priceWeekend ?? null },
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
}
