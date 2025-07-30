import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import MilestoneTimeline from "@/components/plan/roadmap/MilestoneTimeline";

export default function RoadmapPage() {
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
                    <span className="font-semibold">Tháng 9/2026</span>
                  </li>
                  <li>
                    Giá trị căn nhà:{" "}
                    <span className="font-semibold">2,2 tỷ</span>
                  </li>
                </ul>
                <div className="w-full h-2 bg-slate-700 rounded-full mt-2">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: "15%" }}
                  ></div>
                </div>
              </div>
              <div className="text-sm font-semibold text-black">15%</div>
            </div>
          </div>

          <MilestoneTimeline
            milestones={[
              { id: 1, title: "Cột mốc số 1", amount: "Tích lũy đạt 550 triệu", status: "done" },
              { id: 2, title: "Cột mốc số 2", amount: "Tích lũy đạt 600 triệu", status: "current", icon: "/icon-milestone2.png" },
              { id: 3, title: "Cột mốc số 3", amount: "Tích lũy đạt 700 triệu", status: "upcoming", icon: "/icon-milestone3.png" },
              { id: 4, title: "Cột mốc số 4", amount: "Tích lũy đạt ...", status: "upcoming", icon: "/icon-milestone4.png" },
            ]}
          />

          {/* Button */}
          <div className="mt-8 px-4">
            <button className="w-full bg-white text-black font-semibold py-2 rounded-xl">Đọc kế hoạch tài chính chuyên sâu</button>
          </div>
        </div>
      </div>
    </main>
  );
}
