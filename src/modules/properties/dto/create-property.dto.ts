import {
  IsBoolean,
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  MinLength,
  ArrayMinSize,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ══════════════════════════════════════════════════
// PASO 1: Servicios
// ══════════════════════════════════════════════════

export class ServicesDto {
  @ApiProperty({ description: 'Ofrece alberca', example: true })
  @IsBoolean({ message: 'hasPool debe ser booleano' })
  hasPool: boolean;

  @ApiProperty({ description: 'Ofrece cabaña', example: true })
  @IsBoolean({ message: 'hasCabin debe ser booleano' })
  hasCabin: boolean;

  @ApiProperty({ description: 'Ofrece camping', example: false })
  @IsBoolean({ message: 'hasCamping debe ser booleano' })
  hasCamping: boolean;
}

// ══════════════════════════════════════════════════
// PASO 2: Ubicación
// ══════════════════════════════════════════════════

export class LocationDto {
  @ApiProperty({ example: 'Av. Los Pinos' })
  @IsString()
  @MinLength(1, { message: 'La calle es requerida' })
  @MaxLength(200)
  street: string;

  @ApiProperty({ example: '332' })
  @IsString()
  @MinLength(1, { message: 'El número exterior es requerido' })
  @MaxLength(20)
  exteriorNumber: string;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  interiorNumber?: string;

  @ApiPropertyOptional({ example: 'Col. Las Águilas' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @ApiProperty({ example: '20130' })
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  zipCode: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  stateId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  cityId: number;

  @ApiProperty({ example: 21.8853 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: -102.2916 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 'ChIJ2c3f...' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  googlePlaceId?: string;

  @ApiPropertyOptional({ example: 'Av. Los Pinos 332, Col. Las Águilas, Aguascalientes' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  formattedAddress?: string;
}

// ══════════════════════════════════════════════════
// PASO 3: Info Básica + Precios
// ══════════════════════════════════════════════════

export class PoolPricingDto {
  @ApiProperty({ example: '09:00' })
  @IsString()
  checkInTime: string;

  @ApiProperty({ example: '21:00' })
  @IsString()
  checkOutTime: string;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  @Max(24)
  maxHours: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minHours?: number;

  @ApiProperty({ example: 1500.0 })
  @IsNumber()
  @Min(0)
  priceWeekday: number;

  @ApiProperty({ example: 2000.0 })
  @IsNumber()
  @Min(0)
  priceWeekend: number;
}

export class CabinPricingDto {
  @ApiProperty({ example: '15:00' })
  @IsString()
  checkInTime: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  checkOutTime: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minNights?: number;

  @ApiProperty({ example: 2500.0 })
  @IsNumber()
  @Min(0)
  priceWeekday: number;

  @ApiProperty({ example: 3500.0 })
  @IsNumber()
  @Min(0)
  priceWeekend: number;
}

export class CampingPricingDto {
  @ApiProperty({ example: '14:00' })
  @IsString()
  checkInTime: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  checkOutTime: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minNights?: number;

  @ApiProperty({ example: 500.0 })
  @IsNumber()
  @Min(0)
  priceWeekday: number;

  @ApiProperty({ example: 700.0 })
  @IsNumber()
  @Min(0)
  priceWeekend: number;
}

export class BasicInfoDto {
  @ApiProperty({ example: 'Rancho Los Pinos' })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100)
  propertyName: string;

  @ApiPropertyOptional({ example: 'Hermoso espacio familiar con alberca climatizada.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PoolPricingDto)
  pool?: PoolPricingDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CabinPricingDto)
  cabin?: CabinPricingDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CampingPricingDto)
  camping?: CampingPricingDto;
}

// ══════════════════════════════════════════════════
// PASO 4: Amenidades
// ══════════════════════════════════════════════════

export class AmenityItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  amenityId: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class PoolAmenitiesDto {
  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(1)
  maxPersons: number;

  @ApiPropertyOptional({ example: 22.0 })
  @IsOptional()
  @IsNumber()
  temperatureMin?: number;

  @ApiPropertyOptional({ example: 28.0 })
  @IsOptional()
  @IsNumber()
  temperatureMax?: number;

  @ApiProperty({ type: [AmenityItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmenityItemDto)
  items: AmenityItemDto[];
}

export class CabinAmenitiesDto {
  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  maxGuests: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  bedrooms: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  singleBeds: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  doubleBeds: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  fullBathrooms: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  halfBathrooms?: number;

  @ApiProperty({ type: [AmenityItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmenityItemDto)
  items: AmenityItemDto[];
}

export class CampingAmenitiesDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  maxPersons: number;

  @ApiProperty({ example: 500.0 })
  @IsNumber()
  @Min(1)
  areaSquareMeters: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  approxTents: number;

  @ApiProperty({ type: [AmenityItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmenityItemDto)
  items: AmenityItemDto[];
}

export class AmenitiesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PoolAmenitiesDto)
  pool?: PoolAmenitiesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CabinAmenitiesDto)
  cabin?: CabinAmenitiesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CampingAmenitiesDto)
  camping?: CampingAmenitiesDto;
}

// ══════════════════════════════════════════════════
// PASO 5: Reglas
// ══════════════════════════════════════════════════

export class RuleDto {
  @ApiProperty({ example: 'No se permiten fiestas después de las 10pm' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  order: number;
}

// ══════════════════════════════════════════════════
// PASO 6: Imágenes
// ══════════════════════════════════════════════════

export class ImageDto {
  @ApiProperty({ example: 'https://firebasestorage.googleapis.com/v0/b/poolandchillapp/o/img1.jpg' })
  @IsUrl({}, { message: 'La URL de la imagen no es válida' })
  url: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isPrimary: boolean;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  order: number;
}

// ══════════════════════════════════════════════════
// DTO PRINCIPAL
// ══════════════════════════════════════════════════

export class CreatePropertyDto {
  @ApiProperty({ description: 'Servicios que ofrece la propiedad' })
  @ValidateNested()
  @Type(() => ServicesDto)
  services: ServicesDto;

  @ApiProperty({ description: 'Ubicación de la propiedad' })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ description: 'Información básica y precios' })
  @ValidateNested()
  @Type(() => BasicInfoDto)
  basicInfo: BasicInfoDto;

  @ApiProperty({ description: 'Amenidades por tipo de servicio' })
  @ValidateNested()
  @Type(() => AmenitiesDto)
  amenities: AmenitiesDto;

  @ApiProperty({ description: 'Reglas del establecimiento', type: [RuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleDto)
  rules: RuleDto[];

  @ApiProperty({ description: 'Imágenes de la propiedad', type: [ImageDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos una imagen' })
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images: ImageDto[];
}
