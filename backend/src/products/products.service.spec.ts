import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const prisma = {
    product: {
      findMany: jest.fn(),
    },
  };

  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(prisma as unknown as PrismaService);
  });

  it('validates pageSize between 5 and 50', async () => {
    await expectValidationErrorsForPageSize(4);
    await expectValidationErrorsForPageSize(51);
    await expectValidationErrorsForPageSize(10.5);

    const validQuery = plainToInstance(GetProductsQueryDto, { pageSize: 5 });

    await expect(validate(validQuery)).resolves.toHaveLength(0);
  });

  it('returns the expected cursor pagination response shape', async () => {
    prisma.product.findMany.mockResolvedValue([
      makeProduct('product-3', '2026-01-01T00:03:00.000Z'),
      makeProduct('product-2', '2026-01-01T00:02:00.000Z'),
      makeProduct('product-1', '2026-01-01T00:01:00.000Z'),
    ]);

    const response = await service.findMany({ pageSize: 2 });

    const findManyCalls = prisma.product.findMany.mock.calls as [
      [
        {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }];
          take: number;
          select: Record<string, boolean>;
        },
      ],
    ];
    const findManyArgs = findManyCalls[0][0];

    expect(findManyArgs.orderBy).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(findManyArgs.take).toBe(3);
    expect(findManyArgs.select).toMatchObject({
      id: true,
      name: true,
      price: true,
      createdAt: true,
    });
    expect(response.items).toHaveLength(2);
    expect(response.items[0]).toMatchObject({
      id: 'product-3',
      price: '19.99',
    });
    expect(response.items[1]).toMatchObject({
      id: 'product-2',
      price: '19.99',
    });
    expect(typeof response.nextCursor).toBe('string');
    expect(response.hasMore).toBe(true);
  });

  it('rejects malformed cursors before querying products', async () => {
    await expect(
      service.findMany({ pageSize: 20, cursor: 'not-a-valid-cursor' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
});

async function expectValidationErrorsForPageSize(pageSize: number) {
  const query = plainToInstance(GetProductsQueryDto, { pageSize });
  const errors = await validate(query);

  expect(errors).toEqual([
    expect.objectContaining({
      property: 'pageSize',
    }),
  ]);
}

function makeProduct(id: string, createdAt: string) {
  return {
    id,
    name: `Product ${id}`,
    description: `Description for ${id}`,
    price: new Prisma.Decimal('19.99'),
    imageUrl: `https://picsum.photos/seed/${id}/640/480`,
    stock: 10,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  };
}
