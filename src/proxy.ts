import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything needs a login except the sign-in page itself.
const isPublic = createRouteMatcher(["/sign-in(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

// Now also covers .html, .js, .css and photos, because your original
// site is served from a private folder and must stay behind the login.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)", "/(api|trpc)(.*)"],
};
