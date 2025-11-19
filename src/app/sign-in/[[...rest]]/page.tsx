"use client";

import { SignIn } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#121212]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary: "bg-slate-800 hover:bg-slate-700 text-white",
                card: "bg-transparent shadow-none",
                headerTitle: "text-white",
                headerSubtitle: "text-slate-400",
                formFieldLabel: "text-slate-300",
                formFieldInput: "bg-slate-900 border-slate-700 text-white",
                footerActionLink: "text-slate-400 hover:text-white",
              },
            }}
            routing="hash"
          />
        </CardContent>
      </Card>
    </main>
  );
}