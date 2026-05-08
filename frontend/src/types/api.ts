export type User = {
  id: string;
  email: string;
  createdAt: string;
};

export type AuthResponse = {
  user: User;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  stock: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductsResponse = {
  items: Product[];
  nextCursor: string | null;
  hasMore: boolean;
};
