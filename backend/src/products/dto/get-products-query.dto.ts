import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetProductsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(50)
  pageSize = 20;

  @IsOptional()
  @IsString()
  cursor?: string;
}
