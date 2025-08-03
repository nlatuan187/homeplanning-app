import React from "react";
import { Button } from "@/components/ui/button";

export default function MilestoneCompleted({ onNext }: { onNext: () => void }) {
  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-72px)] text-center px-6">
        <h2 className="text-2xl font-semibold mb-2">Chúc mừng!</h2>
        <p className="text-slate-300 text-base mb-8">Bạn đã tích lũy được 50 triệu đầu tiên!</p>
        <div className="w-[200px] h-[300px] bg-gray-400 rounded mb-8" />
        <p className="text-slate-400 text-sm">
          Còn 5 cột mốc nữa để chạm tay tới căn nhà đầu tiên, hãy tiếp tục cố gắng nhé!
        </p>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-950">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <Button
            onClick={onNext}
            className="w-full bg-white text-black font-semibold py-2 rounded-xl shadow-lg"
          >
            Chinh phục cột mốc tiếp theo
          </Button>
        </div>
      </div>
    </div>
  );
}
