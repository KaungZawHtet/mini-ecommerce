import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SERVER_API_URL = process.env.BACKEND_INTERNAL_URL ?? API_URL;
const COOKIE_NAME = "session_token";

export async function POST(request: Request) {
  const backendResponse = await fetch(`${SERVER_API_URL}/auth/logout`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  if (!backendResponse.ok && backendResponse.status !== 401) {
    return NextResponse.json(
      { message: "Logout failed" },
      { status: backendResponse.status },
    );
  }

  const response = NextResponse.json({ success: true });
  const backendSetCookie = backendResponse.headers.get("set-cookie");

  if (backendSetCookie) {
    response.headers.append("set-cookie", backendSetCookie);
  }

  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  if (request.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL("/login", request.url), {
      headers: response.headers,
      status: 303,
    });
  }

  return response;
}
