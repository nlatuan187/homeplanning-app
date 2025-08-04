import React from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import MilestoneTimeline from "@/components/plan/roadmap/MilestoneTimeline";
import { Plan } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";

export default async function RoadmapPage({
  params,
}: {
  params: { planId: string };
}) {
  const router = useRouter();
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const plan = await db.plan.findUnique({
    where: { id: params.planId, userId: user.id },
    include: { familySupport: true },
  });

  if (!plan) {
    redirect("/dashboard");
  }
  
  const savingsPercentage = Math.round((plan.initialSavings / plan.targetHousePriceN0) * 100)

  const projections = generateProjections(plan);
  
  const currentProjection = projections.find(p => p.year === plan.confirmedPurchaseYear) || projections[0];
  const housePriceProjected = currentProjection.housePriceProjected ?? plan.targetHousePriceN0

  console.log("housePriceProjected",housePriceProjected)

  
  return (
    <main className="min-h-screen bg-black text-white md:p-4">
      <div className="container mx-auto max-w-5xl">
        <div className="min-h-screen bg-black text-white font-sans">
          {/* Header + InfoCard chung 1 block sticky */}
          <div className="sticky top-0 z-50 bg-black pb-2">
            {/* Header */}
            <header className="px-4 py-3 flex items-center justify-center relative">
              <Button
                variant="ghost"
                size="icon"
                className="text-white absolute left-4"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <div className="text-base font-bold">KẾ HOẠCH HÀNH ĐỘNG</div>
            </header>

            {/* Info Card */}
            <div className="bg-white mx-4 p-4 flex gap-4 items-center shadow-md">
              <Image
                src="/avatar.png"
                alt="Avatar"
                width={48}
                height={48}
                className="rounded-full"
              />
              <div className="flex-1 text-sm text-black">
                <div className="font-semibold">Mua chung cư tại Hà Nội</div>
                <ul className="list-disc list-inside text-xs mt-1">
                  <li>
                    Thời gian mua:{" "}
                    <span className="font-semibold">
                      Tháng 9/{plan.confirmedPurchaseYear}
                    </span>
                  </li>
                  <li>
                    Giá trị căn nhà:{" "}
                    <span className="font-semibold">
                      {(housePriceProjected / 1000).toFixed(1)} tỷ
                    </span>
                  </li>
                </ul>
                <div className="w-full h-2 bg-slate-700 rounded-full mt-2">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${savingsPercentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm font-semibold text-black">
                {savingsPercentage}%
              </div>
            </div>
          </div>

          <MilestoneTimeline plan={plan}/>

          <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-950">
            <div className="container mx-auto max-w-5xl px-4">
              <Button
                className="w-full bg-white text-black font-semibold rounded-xl shadow-lg"
                onClick={() => router.push(`/plan/${plan.id}/results`)} 
              >
                Đọc kế hoạch tài chính chuyên sâu
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
