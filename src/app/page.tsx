"use client";

import { useAuth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { useEffect } from "react";

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      redirect("/dashboard");
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </main>
    );
  }

  if (!isSignedIn) {
    return <OnboardingFlow planId={""} />;
  }

  // This part should ideally not be reached if redirection works correctly in useEffect
  // or if the user is signed in, they are redirected.
  // However, as a fallback or during initial load before useEffect kicks in,
  // we can show a loading or a blank screen.
  // For robustness, redirecting here as well if somehow useEffect didn't catch it.
  if (isSignedIn) {
     // This might cause a client/server hydration mismatch warning if redirect happens too late.
     // The useEffect approach is generally preferred for client-side redirects.
     // Consider if this direct redirect is necessary or if useEffect is sufficient.
     // For now, keeping it simple, relying on useEffect.
     // If issues arise, this could be a point of investigation.
     // redirect("/dashboard"); // Potentially problematic here, relying on useEffect
     return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-950">
          <p className="text-white">Đang chuyển hướng...</p>
        </main>
     );
  }

  return null; // Should not be reached if logic is correct
}
