import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsInt,
  IsArray,
  IsBoolean,
  IsUrl,
  IsUUID,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  MinLength,
  ArrayMinSize,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Reutilizamos tipos de create donde aplica
import { PoolPricingDto, CabinPricingDto, CampingPricingDto } from './create-property.dto';
import { AmenityItemDto, RuleDto } from './create-property.dto';

// ══════════════════════════════════════════════════
// Update Basic Info (sin PropertyName)
// ══════════════════════════════════════════════════

export class UpdateBasicInfoDto {
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

export class UpdateBasicInfoBodyDto {
  @ApiProperty({ description: 'UUID de la propiedad' })
  @IsUUID('4', { message: 'propertyId debe ser un UUID válido' })
  propertyId: string;

  @ApiProperty({
    description: 'Al menos un campo: description, pool, cabin o camping',
  })
  @IsNotEmpty({ message: 'data es obligatorio' })
  @IsObject({ message: 'data debe ser un objeto con al menos un campo (description, pool, cabin o camping)' })
  @ValidateNested()
  @Type(() => UpdateBasicInfoDto)
  data: UpdateBasicInfoDto;
}

// ══════════════════════════════════════════════════
// Update Pool Amenities
// ══════════════════════════════════════════════════

export class UpdatePoolAmenitiesDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4')
  propertyId: string;

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

  @ApiPropertyOptional({ type: [AmenityItemDto], description: 'Si se envía, reemplaza amenidades' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmenityItemDto)
  items?: AmenityItemDto[];
}

// ══════════════════════════════════════════════════
// Update Cabin Amenities
// ══════════════════════════════════════════════════

export class UpdateCabinAmenitiesDto {
  @ApiProperty()
  @IsUUID('4')
  propertyId: string;

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

  @ApiPropertyOptional({ type: [AmenityItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmenityItemDto)
  items?: AmenityItemDto[];
}

// ══════════════════════════════════════════════════
// Update Camping Amenities
// ══════════════════════════════════════════════════

export class UpdateCampingAmenitiesDto {
  @ApiProperty()
  @IsUUID('4')
  propertyId: string;

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

  @ApiPropertyOptional({ type: [AmenityItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmenityItemDto)
  items?: AmenityItemDto[];
}

// ══════════════════════════════════════════════════
// Update Rules
// ══════════════════════════════════════════════════

export class UpdateRulesDto {
  @ApiProperty()
  @IsUUID('4')
  propertyId: string;

  @ApiProperty({ type: [RuleDto], description: 'Reemplaza reglas activas. Al menos una regla.' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe existir al menos una regla' })
  @ValidateNested({ each: true })
  @Type(() => RuleDto)
  rules: RuleDto[];
}

// ══════════════════════════════════════════════════
// Add Image
// ══════════════════════════════════════════════════

export class AddPropertyImageDto {
  @ApiProperty()
  @IsUUID('4')
  propertyId: string;

  @ApiProperty({ example: 'https://storage.example.com/image.jpg' })
  @IsUrl({}, { message: 'imageUrl debe ser una URL válida' })
  imageUrl: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isPrimary: boolean;
}

// ══════════════════════════════════════════════════
// Delete Image
// ══════════════════════════════════════════════════

export class DeletePropertyImageDto {
  @ApiProperty()
  @IsUUID('4')
  propertyId: string;

  @ApiProperty({ description: 'ID de la imagen de propiedad a eliminar' })
  @IsUUID('4')
  propertyImageId: string;
}
