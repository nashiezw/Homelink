import { IsString, MinLength } from "class-validator";

export class AiSearchDto {
  @IsString()
  @MinLength(3)
  query!: string;
}
