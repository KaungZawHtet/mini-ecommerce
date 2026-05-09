"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/api";
import { PageSizeSelector } from "./components/page-size-selector";
import { ProductsList } from "./components/products-list";
import { useInfiniteProducts } from "./hooks/use-infinite-products";
import { useRequireAuth } from "./hooks/use-require-auth";

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const currentUserQuery = useRequireAuth();
  const productsQuery = useInfiniteProducts({
    pageSize,
    enabled: Boolean(currentUserQuery.data),
  });

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
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
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

  function handlePageSizeChange(nextPageSize: number) {
    if (nextPageSize === pageSize) {
      return;
    }

    window.scrollTo({ left: 0, top: 0 });
    queryClient.removeQueries({ queryKey: ["products"] });
    setPageSize(nextPageSize);
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
        <ProductsList
          products={productsQuery.products}
          isLoading={productsQuery.isLoading}
          isError={productsQuery.isError}
          isFetchingNextPage={productsQuery.isFetchingNextPage}
          hasNextPage={Boolean(productsQuery.hasNextPage)}
          sentinelRef={sentinelRef}
          onRetry={() => void productsQuery.refetch()}
        />
      </section>
    </main>
  );
}
