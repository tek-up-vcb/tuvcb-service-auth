import { IsString, IsNotEmpty } from 'class-validator';

export class AuthDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class NonceDto {
  @IsString()
  @IsNotEmpty()
  address: string;
}
