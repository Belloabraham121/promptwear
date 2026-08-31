import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SizeBreakdownDto } from './size-breakdown.dto';

class CheckoutContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(32)
  phone!: string;
}

class DeliveryAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  state!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  country!: string;
}

class OrderCheckoutDto {
  @ValidateNested()
  @Type(() => CheckoutContactDto)
  contact!: CheckoutContactDto;

  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  address!: DeliveryAddressDto;

  @IsEnum(['card', 'bank_transfer', 'wallet'])
  paymentMethod!: 'card' | 'bank_transfer' | 'wallet';
}

export class CreateOrderDto {
  @IsString()
  designId!: string;

  @IsEnum(['standard', 'premium', 'heavy'])
  quality!: 'standard' | 'premium' | 'heavy';

  @IsEnum(['dtf', 'screen'])
  print!: 'dtf' | 'screen';

  @ValidateNested()
  @Type(() => SizeBreakdownDto)
  sizes!: SizeBreakdownDto;

  @IsOptional()
  @IsBoolean()
  rush?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  couponCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ValidateNested()
  @Type(() => OrderCheckoutDto)
  checkout!: OrderCheckoutDto;
}
