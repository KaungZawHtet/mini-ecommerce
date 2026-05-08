"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getCurrentUser, getProducts, logout } from "@/lib/api";
import type { Product } from "@/types/api";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50];

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState(20);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    retry: false,
  });

  useEffect(() => {
    if (!currentUserQuery.isLoading && !currentUserQuery.data) {
      router.replace("/login");
    }
  }, [currentUserQuery.data, currentUserQuery.isLoading, router]);

  const productsQuery = useInfiniteQuery({
    queryKey: ["products", pageSize],
    queryFn: ({ pageParam }) =>
      getProducts({ pageSize, cursor: pageParam ?? null }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: Boolean(currentUserQuery.data),
  });

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [productsQuery.data],
  );
  const fetchNextPage = productsQuery.fetchNextPage;
  const hasNextPage = productsQuery.hasNextPage;
  const isFetchingNextPage = productsQuery.isFetchingNextPage;

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          void fetchNextPage();
        }
      },
      { rootMargin: "320px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: async () => {
      await queryClient.clear();
      router.replace("/login");
    },
  });

  if (currentUserQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-slate-600">Checking session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Products</h1>
            <p className="mt-1 text-sm text-slate-600">
              {currentUserQuery.data?.user.email}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">
              Page size
              <select
                className="ml-2 h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-900"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {logoutMutation.isPending ? "Signing out..." : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {productsQuery.isLoading ? (
          <ProductGridSkeleton />
        ) : productsQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-medium text-red-800">
              Products could not be loaded.
            </p>
            <button
              type="button"
              onClick={() => void productsQuery.refetch()}
              className="mt-4 h-10 rounded-md bg-red-700 px-4 text-sm font-medium text-white transition hover:bg-red-800"
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-medium text-slate-800">
              No products found.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={index < 3}
                />
              ))}
            </div>

            <div ref={sentinelRef} className="h-10" />

            <div className="flex justify-center py-6">
              {productsQuery.isFetchingNextPage ? (
                <p className="text-sm text-slate-600">Loading more...</p>
              ) : productsQuery.hasNextPage ? (
                <p className="text-sm text-slate-500">Scroll for more</p>
              ) : (
                <p className="text-sm text-slate-500">End of catalog</p>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function ProductCard({
  product,
  priority,
}: {
  product: Product;
  priority: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[4/3] bg-slate-100">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={640}
          height={480}
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">
            {product.name}
          </h2>
          <p className="shrink-0 text-sm font-semibold text-slate-950">
            ${product.price}
          </p>
        </div>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
          {product.description}
        </p>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">
          {product.stock} in stock
        </p>
      </div>
    </article>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white"
        >
          <div className="h-44 bg-slate-100" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-2/3 rounded bg-slate-100" />
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-5/6 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
