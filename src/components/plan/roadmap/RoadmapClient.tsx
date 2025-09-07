"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import MilestoneTimeline from "@/components/plan/roadmap/MilestoneTimeline";
import { Plan, MilestoneProgress } from "@prisma/client";
import { UserButton } from "@clerk/nextjs";
import BottomNavbar from "@/components/layout/BottomNavbar";
import { MilestoneGroup } from "@/lib/isMilestoneUnlocked";

interface RoadmapClientProps {
  plan: Plan;
  savingsPercentage: number;
  housePriceProjected: number;
  cumulativeGoal: number;
  milestoneGroups: MilestoneGroup[];
  currentSavings: number;
}

export default function RoadmapClient({
  plan,
  savingsPercentage,
  housePriceProjected,
  cumulativeGoal,
  milestoneGroups,
  currentSavings,
}: RoadmapClientProps) {
  const router = useRouter();
  
  const [progressPercentage, setProgressPercentage] = useState(savingsPercentage);
  const purchaseYear = plan.confirmedPurchaseYear ?? new Date(plan.createdAt).getFullYear() + plan.yearsToPurchase;

  return (
    <>
      <main className="min-h-screen bg-slate-950 text-white md:p-4 pb-20">
        <div className="container mx-auto max-w-5xl">
          <div className="font-sans">
            <div className="sticky top-0 z-50 pb-2">
              <header className="px-4 py-3 flex items-center justify-center relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white absolute left-4"
                  onClick={() => router.push(`/plan/${plan.id}/playground`)}
                >
                  <ArrowLeft className="h-6 w-6" />
                </Button>
                <div className="text-base font-bold">KẾ HOẠCH HÀNH ĐỘNG</div>
              </header>
            </div>

            <div className="bg-white py-4 px-6 flex flex-row gap-4 items-center border-b-white">
              <div className="scale-200 px-2">
                <UserButton afterSignOutUrl="/" />
              </div>
              <div className="flex-1 text-sm text-black">
                <div className="font-semibold">Mua {plan.targetHouseType} tại {plan.targetLocation}</div>
                <ul className="list-disc list-inside text-xs mt-1">
                  <li>
                    Thời gian mua:{" "}
                    <span className="font-semibold">
                      Tháng {new Date(plan.createdAt).getMonth() + 1}/{purchaseYear}
                    </span>
                  </li>
                  <li>
                    Giá trị căn nhà:{" "}
                    <span className="font-semibold">
                      {
                        housePriceProjected >= 1000 ? (
                          `${(housePriceProjected / 1000).toFixed(2)} tỷ`
                        ) : (
                          `${housePriceProjected} triệu`
                        )
                      }
                    </span>
                  </li>
                  <li>
                    Giá trị cần tiết kiệm:{" "}
                    <span className="font-semibold">
                      {
                        cumulativeGoal >= 1000 ? (
                          `${(cumulativeGoal / 1000).toFixed(2)} tỷ`
                        ) : (
                          `${cumulativeGoal.toFixed(2)} triệu`
                        )
                      }
                    </span>
                  </li>
                </ul>
              </div>
              <div className="text-sm font-semibold text-black self-end">
                {progressPercentage}%
              </div>
            </div>
            <div className="bg-white px-6 pb-0.5 items-center">
              <div className="mb-2 h-2 bg-slate-700 rounded-lg">
                <div
                  className="h-full bg-[#00ACB8] rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            <div className="bottom-0 inset-x-0 z-50 px-4 mb-2">
              <MilestoneTimeline 
                plan={plan} 
                milestoneGroups={milestoneGroups} 
                currentSavings={currentSavings} 
              />
            </div>

            <div className="bottom-0 inset-x-0 z-50 px-4 mb-10 pb-5">
              <Button
                className="w-full bg-white text-black font-semibold cursor-pointer rounded-xl shadow-lg"
                onClick={() => router.push(`/plan/${plan.id}/report`)} 
              >
                Đọc kế hoạch tài chính chuyên sâu
              </Button>
            </div>
          </div>
        </div>
      </main>
      <BottomNavbar planId={plan.id} />
    </>
  );
}