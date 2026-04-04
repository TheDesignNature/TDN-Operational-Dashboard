/**
 * Auth API route
 *
 * POST /api/auth
 * Checks the submitted password against APP_PASSWORD env var.
 * Sets an auth cookie on success.
 *
 * DELETE /api/auth
 * Clears the auth cookie (logout).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const correctPassword = process.env["APP_PASSWORD"];

  if (!correctPassword) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (password !== correctPassword) {
    return NextResponse.json(
      { error: "Incorrect password" },
      { status: 401 }
    );
  }

  // Password correct — set auth cookie
  const response = NextResponse.json({ success: true });

  response.cookies.set("auth_token", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Cookie lasts 7 days
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}

export async function DELETE() {
  // Logout — clear the cookie
  const response = NextResponse.json({ success: true });

  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
