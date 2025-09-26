import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define protected routes that require authentication (exclude auth pages)
const isProtectedRoute = createRouteMatcher(["/admin(.*)"]);

// Define public routes that don't require authentication (include catch-all auth paths)
const isPublicRoute = createRouteMatcher([
  "/",
  "/admin/sign-in(.*)",
  "/admin/sign-up(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow unauthenticated access to sign-in and sign-up (including nested catch-all)
  const path = req.nextUrl.pathname;
  // Skip protection for public routes including auth pages catch-all
  if (isPublicRoute(req)) {
    return;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
