import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemConfig } from "@/db/schema";
import { hashPassword, verifyPassword, generateToken, checkRateLimit } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    // Default admin credentials for demo
    const validUsers: Record<string, { password: string; role: string }> = {
      admin: { password: "admin123", role: "admin" },
      viewer: { password: "viewer123", role: "viewer" },
    };

    const user = validUsers[username];
    if (!user || password !== user.password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = generateToken({ userId: username, role: user.role });
    const response = NextResponse.json({ success: true, user: { username, role: user.role }, token });
    response.cookies.set("linkage_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("linkage_session");
  return response;
}
