"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageSizeSelector } from "./components/page-size-selector";
import { ProductsList } from "./components/products-list";
import { useInfiniteProducts } from "./hooks/use-infinite-products";
import { useRequireAuth } from "./hooks/use-require-auth";
import { logoutWithFallback } from "@/lib/api";
import { useInfiniteScrollTrigger } from "./hooks/use-infinite-scroll-trigger";
export default function ProductsPage() {
  const queryClient = useQueryClient();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const canFetchMoreRef = useRef(false);
  const [pageSize, setPageSize] = useState(20);
  const [canFetchMore, setCanFetchMore] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const currentUserQuery = useRequireAuth();
  const productsQuery = useInfiniteProducts({
    pageSize,
    enabled: Boolean(currentUserQuery.data),
  });

  useInfiniteScrollTrigger({
    sentinelRef,
    canFetchMoreRef,
    productsCount: productsQuery.products.length,
    pageSize,
    hasNextPage: Boolean(productsQuery.hasNextPage),
    isFetchingNextPage: productsQuery.isFetchingNextPage,
    fetchNextPage: () => void productsQuery.fetchNextPage(),
    onCanFetchMoreChange: setCanFetchMore,
  });

  function handlePageSizeChange(nextPageSize: number) {
    if (nextPageSize === pageSize) {
      return;
    }

    canFetchMoreRef.current = false;
    setCanFetchMore(false);
    window.scrollTo({ left: 0, top: 0 });
    queryClient.removeQueries({ queryKey: ["products"] });
    setPageSize(nextPageSize);
  }

  async function handleLogout(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logoutWithFallback();
    } finally {
      queryClient.clear();
      window.location.assign("/login");
    }
  }

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
            <PageSizeSelector
              pageSize={pageSize}
              onChange={handlePageSizeChange}
            />

            <form
              action="/api/session/end"
              method="post"
              onSubmit={(event) => void handleLogout(event)}
            >
              <button
                type="submit"
                onPointerDown={() => void handleLogout()}
                disabled={isLoggingOut}
                className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <ProductsList
          products={productsQuery.products}
          isLoading={productsQuery.isLoading}
          isError={productsQuery.isError}
          isFetchingNextPage={productsQuery.isFetchingNextPage}
          hasNextPage={Boolean(productsQuery.hasNextPage)}
          canFetchMore={canFetchMore}
          sentinelRef={sentinelRef}
          onRetry={() => void productsQuery.refetch()}
        />
      </section>
    </main>
  );
}
