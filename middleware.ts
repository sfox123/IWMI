import { NextResponse, type NextRequest } from "next/server";

// Basic auth for the admin area and file downloads.
// Swap for SSO (e.g. Microsoft Entra via NextAuth) before wide rollout.
export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER ?? "admin";
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return new NextResponse("Admin area disabled: set ADMIN_PASSWORD", { status: 503 });
  const header = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const [u, ...rest] = atob(encoded).split(":");
    if (u === user && rest.join(":") === pass) return NextResponse.next();
  }
  return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Data Request Admin"' } });
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/api/files/:path*"] };
