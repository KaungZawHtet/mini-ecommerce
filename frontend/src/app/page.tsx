"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    retry: false,
  });

  useEffect(() => {
    if (isLoading) {
      return;
    }

    router.replace(data ? "/products" : "/login");
  }, [data, isLoading, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-sm text-slate-600">Checking session...</p>
    </main>
  );
}
