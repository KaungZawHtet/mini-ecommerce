"use client";

import type { RefObject } from "react";
import type { Product } from "@/types/api";
import { ProductCard } from "./product-card";

export function ProductsList({
  products,
  isLoading,
  isError,
  isFetchingNextPage,
  hasNextPage,
  sentinelRef,
  onRetry,
}: {
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onRetry: () => void;
}) {
  if (isLoading) {
    return <ProductGridSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-medium text-red-800">
          Products could not be loaded.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 h-10 rounded-md bg-red-700 px-4 text-sm font-medium text-white transition hover:bg-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-800">
          No products found.
        </p>
      </div>
    );
  }

  return (
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
        {isFetchingNextPage ? (
          <p className="text-sm text-slate-600">Loading more...</p>
        ) : hasNextPage ? (
          <p className="text-sm text-slate-500">Scroll for more</p>
        ) : (
          <p className="text-sm text-slate-500">End of catalog</p>
        )}
      </div>
    </>
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
