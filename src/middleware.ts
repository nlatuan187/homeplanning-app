import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
// Note the (.*) at the end of sign-in and sign-up routes to match all sub-routes
const isPublicRoute = createRouteMatcher([
  '/',                  // Trang chủ
  '/sign-in(.*)',       // Trang giao diện đăng nhập
  '/sign-up(.*)',       // Trang giao diện đăng ký
  '/api/auth/sign-in(.*)',       // API đăng nhập
  '/api/auth/sign-up(.*)',       // API đăng ký
  '/api/auth/mobile(.*)',      // THÊM DÒNG NÀY
  '/docs(.*)',
  '/api/webhooks/clerk(.*)',   // Webhook của Clerk

  // == API CÔNG KHAI CỦA BẠN ==
  '/api/image(.*)',            // API lấy ảnh và media
  '/api/onboarding/calculate', // API tính toán nhanh
  '/api/onboarding/start',     // TẠM THỜI MỞ PUBLIC ĐỂ TEST
  '/api/section/next-step(.*)', // << THÊM DÒNG NÀY VÀO ĐÂY
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
