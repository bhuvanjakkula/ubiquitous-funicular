import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const protectedRoute = createRouteMatcher(["/app(.*)", "/api(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname === "/api/webhooks/stripe") return;
  if (protectedRoute(request)) await auth().protect();
});

export const config = { matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"] };
