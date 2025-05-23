import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { viVN } from "@clerk/localizations/vi-VN";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FeedbackButton } from "@/components/feedback-button";

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
          <TooltipProvider>
            {children}
            <FeedbackButton />
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
