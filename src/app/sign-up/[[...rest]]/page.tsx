"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SignUp } from "@clerk/nextjs";
export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#121212]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary:
                  "bg-cyan-500 hover:bg-[#008C96] text-sm normal-case",
                card: "bg-transparent shadow-none",
                headerTitle: "text-white",
                headerSubtitle: "text-slate-400",
                formFieldLabel: "text-slate-300",
                formFieldInput: "bg-slate-900 border-slate-700 text-white",
                footerActionLink: "text-slate-400 hover:text-white",
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}