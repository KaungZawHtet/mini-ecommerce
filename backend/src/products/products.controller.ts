import { Controller, Get, Query } from '@nestjs/common';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findMany(@Query() query: GetProductsQueryDto) {
    return this.productsService.findMany(query);
  }
}
