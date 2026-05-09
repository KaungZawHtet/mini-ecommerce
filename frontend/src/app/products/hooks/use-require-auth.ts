"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api";

export function useRequireAuth() {
  const router = useRouter();
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

  return currentUserQuery;
}
