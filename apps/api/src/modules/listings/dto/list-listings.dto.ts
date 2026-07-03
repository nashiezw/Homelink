import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class ListListingsDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  suburb?: string;

  @IsOptional()
  @IsIn(["rent", "buy"])
  intent?: "rent" | "buy";

  @IsOptional()
  @IsIn(["room", "house", "flat", "cottage", "commercial", "land"])
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsBoolean()
  verifiedOnly?: boolean;
}
