"use client";

import { SubmitEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("Password123!");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (authResponse) => {
      setErrorMessage("");
      queryClient.setQueryData(["current-user"], authResponse);
      router.replace("/products");
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof ApiError && error.status === 401
          ? "Invalid email or password"
          : "Unable to sign in. Please try again.",
      );
    },
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Access the product catalog.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none transition focus:border-slate-900"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loginMutation.isPending}
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Password
            <div className="relative mt-2">
              <input
                className="h-11 w-full rounded-md border border-slate-300 px-3 pr-16 text-slate-950 outline-none transition focus:border-slate-900"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loginMutation.isPending}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={loginMutation.isPending}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-600 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {errorMessage ? (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="mt-6 h-11 w-full rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loginMutation.isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
