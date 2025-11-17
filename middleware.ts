import { NextResponse } from "next/server";
import { authEdge } from "@/lib/auth-edge";

const publicRoutes = ["/login", "/register", "/api/register"];

export default authEdge((request) => {
  const { nextUrl } = request;
  const isAuthenticated = Boolean(request.auth?.user);
  const pathname = nextUrl.pathname;

  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

  if (!isAuthenticated && !isPublic && !pathname.startsWith("/api/auth")) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/library", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
