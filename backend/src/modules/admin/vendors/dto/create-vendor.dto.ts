import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  VENDOR_PRINT_METHODS,
  VENDOR_QUALITIES,
  VendorMaterialQuality,
  VendorPrintMethod,
} from '../../admin.types';

class GarmentCostByQualityDto {
  @IsNumber()
  @Min(0)
  standard!: number;

  @IsNumber()
  @Min(0)
  premium!: number;

  @IsNumber()
  @Min(0)
  heavy!: number;
}

class PrintingCostByMethodDto {
  @IsNumber()
  @Min(0)
  dtf!: number;

  @IsNumber()
  @Min(0)
  screen!: number;
}

export class CreateVendorDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  location!: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  qualityRating!: number;

  @IsNumber()
  @Min(0)
  @Max(5)
  customerRating!: number;

  @IsInt()
  @Min(1)
  capacityPerWeek!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceIndex?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  onTimeRate!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  excluded?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @ValidateNested()
  @Type(() => GarmentCostByQualityDto)
  garmentCostByQuality!: GarmentCostByQualityDto;

  @ValidateNested()
  @Type(() => PrintingCostByMethodDto)
  printingCostByMethod!: PrintingCostByMethodDto;

  @IsArray()
  @IsIn(VENDOR_QUALITIES, { each: true })
  materialAvailable!: VendorMaterialQuality[];

  @IsArray()
  @IsIn(VENDOR_PRINT_METHODS, { each: true })
  printMethods!: VendorPrintMethod[];

  @IsArray()
  @IsString({ each: true })
  deliveryRegions!: string[];

  @IsInt()
  @Min(0)
  shippingCostBase!: number;

  @IsInt()
  @Min(0)
  shippingCostPerUnit!: number;

  @IsInt()
  @Min(1)
  estimatedProductionDays!: number;

  @IsInt()
  @Min(1)
  deliverySlaDays!: number;
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  qualityRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  customerRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacityPerWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceIndex?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  onTimeRate?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  excluded?: boolean;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => GarmentCostByQualityDto)
  garmentCostByQuality?: GarmentCostByQualityDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrintingCostByMethodDto)
  printingCostByMethod?: PrintingCostByMethodDto;

  @IsOptional()
  @IsArray()
  @IsIn(VENDOR_QUALITIES, { each: true })
  materialAvailable?: VendorMaterialQuality[];

  @IsOptional()
  @IsArray()
  @IsIn(VENDOR_PRINT_METHODS, { each: true })
  printMethods?: VendorPrintMethod[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliveryRegions?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  shippingCostBase?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  shippingCostPerUnit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedProductionDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  deliverySlaDays?: number;
}
