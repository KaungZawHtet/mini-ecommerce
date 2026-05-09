"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api";

export function useInfiniteProducts({
  pageSize,
  enabled,
}: {
  pageSize: number;
  enabled: boolean;
}) {
  const query = useInfiniteQuery({
    queryKey: ["products", pageSize],
    queryFn: ({ pageParam }) =>
      getProducts({ pageSize, cursor: pageParam ?? null }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled,
  });
  const products = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return { ...query, products };
}
