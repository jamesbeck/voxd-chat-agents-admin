import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminRoute } from "@/lib/adminRoutes";

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const domain = hostname.split(":")[0]; // Remove port if present

  // Create response
  let response: NextResponse;

  const allowedDomains = ["localhost"];

  // Paths that are always allowed (login and admin)
  const isLoginPath = request.nextUrl.pathname.startsWith("/login");
  const isAdminPath =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/admin") ||
    isAdminRoute(request.nextUrl.pathname);
  const isProposalsPath = request.nextUrl.pathname.startsWith("/proposals");
  const isConceptsPath = request.nextUrl.pathname.startsWith("/concepts");
  const isPitchesPath = request.nextUrl.pathname.startsWith("/pitches"); // Legacy redirect to /concepts
  const isIFramesPath = request.nextUrl.pathname.startsWith("/iframes");
  const isGuidesPath = request.nextUrl.pathname.startsWith("/guides");
  const isPrototypesPath = request.nextUrl.pathname.startsWith("/prototypes");
  const isWebChatPath = request.nextUrl.pathname.startsWith("/web-chat");

  // Only redirect GET requests for tenant domains
  const shouldRedirect =
    !allowedDomains.includes(domain) && // Not an allowed domain
    request.method === "GET" && // Only GET requests
    !isLoginPath && // Not already on login
    !isAdminPath && // Not on admin
    !isProposalsPath && // Not on proposals (public proposal pages)
    !isConceptsPath && // Not on concepts (public concept pages)
    !isPitchesPath && // Not on pitches (legacy redirect to concepts)
    !isIFramesPath && // Not on iframes (public iframe pages)
    !isGuidesPath && // Not on guides (public guide pages)
    !isPrototypesPath && // Not on prototypes (public prototype pages)
    !isWebChatPath; // Not on web-chat (public agent demo pages)

  if (shouldRedirect) {
    const loginUrl = new URL("/login", request.url);
    response = NextResponse.redirect(loginUrl);
  } else {
    response = NextResponse.next();
  }

  // Add custom path header for server components
  response.headers.set("x-pathname", request.nextUrl.pathname);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (images, fonts, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)).*)",
  ],
};
