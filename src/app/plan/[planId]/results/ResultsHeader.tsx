"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function ResultsHeader() {
  const router = useRouter();

  return (
    <header className="relative flex justify-center items-center py-4 px-2">
      <div className="absolute left-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </div>
      <h2 className="font-semibold text-white">Quick check</h2>
    </header>
  );
}
