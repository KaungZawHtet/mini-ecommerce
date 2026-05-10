"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api";
import { LoginForm } from "./components/login-form";

export default function LoginPage() {
  const router = useRouter();

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    retry: false,
  });

  useEffect(() => {
    if (currentUserQuery.data) {
      router.replace("/products");
    }
  }, [currentUserQuery.data, router]);

  if (currentUserQuery.isLoading || currentUserQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-slate-600">Checking session...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <LoginForm />
    </main>
  );
}