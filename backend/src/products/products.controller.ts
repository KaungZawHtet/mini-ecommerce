import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @UseGuards(AuthGuard)
  findMany(@Query() query: GetProductsQueryDto) {
    return this.productsService.findMany(query);
  }
}
