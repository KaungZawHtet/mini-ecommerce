import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetProductsQueryDto } from './dto/get-products-query.dto';

const CURSOR_SEPARATOR = '|';
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

const productListSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  imageUrl: true,
  stock: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

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
      select: productListSelect,
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
      if (!BASE64URL_PATTERN.test(cursor)) {
        throw new Error('Invalid cursor');
      }

      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const cursorParts = decoded.split(CURSOR_SEPARATOR);

      if (cursorParts.length !== 2) {
        throw new Error('Invalid cursor');
      }

      const [createdAtValue, id] = cursorParts;
      const createdAt = new Date(createdAtValue);

      if (
        !createdAtValue ||
        !id ||
        id.trim() !== id ||
        Number.isNaN(createdAt.getTime()) ||
        createdAt.toISOString() !== createdAtValue
      ) {
        throw new Error('Invalid cursor');
      }

      return { createdAt, id };
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }
}
