"use client";

import { RefObject, useEffect } from "react";

type UseInfiniteScrollTriggerParams = {
  sentinelRef: RefObject<HTMLDivElement | null>;
  canFetchMoreRef: RefObject<boolean>;
  productsCount: number;
  pageSize: number;
  canFetchMore: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onCanFetchMoreChange: (canFetchMore: boolean) => void;
};

export function useInfiniteScrollTrigger({
  sentinelRef,
  canFetchMoreRef,
  productsCount,
  pageSize,
  canFetchMore,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onCanFetchMoreChange,
}: UseInfiniteScrollTriggerParams) {
  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          canFetchMoreRef.current &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          fetchNextPage();
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [
    sentinelRef,
    canFetchMoreRef,
    canFetchMore,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  ]);

  useEffect(() => {
    function allowFetchAfterUserScroll({
      requireScrollOffset = true,
    }: {
      requireScrollOffset?: boolean;
    } = {}) {
      if (
        canFetchMoreRef.current ||
        (requireScrollOffset && window.scrollY < 24) ||
        productsCount < pageSize
      ) {
        return;
      }

      canFetchMoreRef.current = true;
      onCanFetchMoreChange(true);

      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }

    function handleScroll() {
      allowFetchAfterUserScroll();
    }

    function handleScrollIntent() {
      allowFetchAfterUserScroll({ requireScrollOffset: false });
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === "End" ||
        event.key === "PageDown" ||
        event.key === " " ||
        event.key === "ArrowDown"
      ) {
        allowFetchAfterUserScroll({ requireScrollOffset: false });
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleScrollIntent, { passive: true });
    window.addEventListener("touchmove", handleScrollIntent, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleScrollIntent);
      window.removeEventListener("touchmove", handleScrollIntent);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    sentinelRef,
    canFetchMoreRef,
    productsCount,
    pageSize,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    onCanFetchMoreChange,
  ]);
}
