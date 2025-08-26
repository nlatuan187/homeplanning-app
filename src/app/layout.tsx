import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { viVN } from "@clerk/localizations/vi-VN";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserSync } from "@/components/UserSync";
import { Suspense } from "react";
import { Analytics } from "@/components/analytics";
// import { FeedbackButton } from "@/components/feedback-button"; // Removed FeedbackButton import

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lập kế hoạch mua nhà",
  description: "Công cụ cá nhân hoá cho người Việt mua ngôi nhà đầu tiên",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={viVN}>
      <html lang="vi" className="dark">
        <body className={inter.className}>
          <Suspense fallback={null}>
            <Analytics />
          </Suspense>
          <TooltipProvider>
            <UserSync />
            {children}
            {/* <FeedbackButton /> */} {/* Removed FeedbackButton component */}
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
