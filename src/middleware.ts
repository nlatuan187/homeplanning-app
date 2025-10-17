import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
// Note the (.*) at the end of sign-in and sign-up routes to match all sub-routes
const isPublicRoute = createRouteMatcher([
  '/',                  // Trang chủ
  '/api/auth/sign-in(.*)',       // Trang đăng nhập và các trang con
  '/api/auth/sign-up(.*)',       // Trang đăng ký và các trang con
  '/docs(.*)',

  // == API CÔNG KHAI CỦA BẠN ==
  '/api/onboarding/calculate', // API tính toán nhanh
  '/api/docs',                 // API tài liệu Swagger

  // Có thể thêm các API công khai khác ở đây nếu cần
  // ví dụ: '/api/market-data'
]);

export default clerkMiddleware(async (auth, req) => {
  // If the route is not public, protect it
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
