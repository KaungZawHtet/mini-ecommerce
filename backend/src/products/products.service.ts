import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetProductsQueryDto } from './dto/get-products-query.dto';

const CURSOR_SEPARATOR = '|';

type ProductListItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: GetProductsQueryDto) {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;
    const items = await this.prisma.product.findMany({
      where: cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              {
                createdAt: cursor.createdAt,
                id: { lt: cursor.id },
              },
            ],
          }
        : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.pageSize + 1,
    });

    const hasMore = items.length > query.pageSize;
    const pageItems = items.slice(0, query.pageSize).map((product) => ({
      ...product,
      price: product.price.toFixed(2),
    }));
    const lastItem = pageItems.at(-1);

    return {
      items: pageItems satisfies ProductListItem[],
      nextCursor: hasMore && lastItem ? this.encodeCursor(lastItem) : null,
      hasMore,
    };
  }

  private encodeCursor(product: Pick<ProductListItem, 'createdAt' | 'id'>) {
    return Buffer.from(
      `${product.createdAt.toISOString()}${CURSOR_SEPARATOR}${product.id}`,
      'utf8',
    ).toString('base64url');
  }

  private decodeCursor(cursor: string) {
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const [createdAtValue, id] = decoded.split(CURSOR_SEPARATOR);
      const createdAt = new Date(createdAtValue);

      if (!createdAtValue || !id || Number.isNaN(createdAt.getTime())) {
        throw new Error('Invalid cursor');
      }

      return { createdAt, id };
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }
}
