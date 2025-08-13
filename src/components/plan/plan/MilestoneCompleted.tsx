"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface MilestoneCompletedProps {
  onNext: () => void;
  milestoneId?: number;
  milestoneTitle?: string;
  amountValue?: number | null;
  totalMilestones?: number;
  isLastMilestone?: boolean;
  planId?: string;
}

export default function MilestoneCompleted({ 
  onNext, 
  milestoneId = 1, 
  milestoneTitle = "Goal 1",
  amountValue,
  totalMilestones = 6,
  isLastMilestone = false,
  planId,
}: MilestoneCompletedProps) {
  const router = useRouter();
  
  // Tính toán số cột mốc còn lại
  const remainingMilestones = totalMilestones - milestoneId;
  
  // Logic hiển thị text dựa trên milestone
  let mainText = "";
  let subText = "";
  let nextMilestoneText = "";

  if (isLastMilestone) {
    // Cột mốc cuối cùng
    mainText = "Chúc mừng!";
    subText = "Bạn đã chinh phục căn nhà mơ ước";
    nextMilestoneText = "Quay về trang chủ";
  } else {
    // Các cột mốc khác
    const amountText = amountValue ? 
      (amountValue >= 1000 ? `${(amountValue / 1000).toFixed(1)} tỷ` : `${Math.round(amountValue).toLocaleString()} triệu`) 
      : "mục tiêu";
    console.log("amountValue", amountValue)
    mainText = `Chúc mừng`;
    subText = `Bạn đã tích luỹ được ${amountText}`;
    nextMilestoneText = "Chinh phục cột mốc tiếp theo";
  }

  const handleNextClick = () => {
    if (isLastMilestone) {
      // Nếu là milestone cuối cùng, chuyển về roadmap
      router.push(`/plan/${planId}/roadmap`);
    } else {
      // Nếu không phải milestone cuối cùng, chuyển đến milestone tiếp theo
      const nextMilestoneId = milestoneId + 1;
      router.push(`/plan/${planId}/plan?milestoneId=${nextMilestoneId}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-72px)] text-center px-6">
        <h2 className="text-2xl font-semibold mb-2">{mainText}</h2>
        <p className="text-slate-300 text-base mb-8">{subText}</p>
        <div className="w-[200px] h-[300px] bg-gray-400 rounded mb-8" />
        {!isLastMilestone ? (
          <p className="text-slate-400 text-sm">
            Còn {remainingMilestones} cột mốc nữa để chạm tay tới căn nhà đầu tiên, hãy tiếp tục cố gắng nhé!
          </p>
        ) : (
          <p className="text-slate-400 text-sm">
            Một hành trình dài đã kết thúc, cảm ơn bạn vì đã nỗ lực không ngừng nghỉ để chạm tới thành công ngày hôm nay!
          </p>
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-950">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <Button
            onClick={handleNextClick}
            className="w-full bg-white text-black font-semibold py-2 rounded-xl shadow-lg"
          >
            {nextMilestoneText}
          </Button>
        </div>
      </div>
    </div>
  );
}
