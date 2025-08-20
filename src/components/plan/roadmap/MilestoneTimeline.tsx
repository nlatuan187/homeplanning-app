"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getMilestonesByGroup, MilestoneGroup } from "@/lib/isMilestoneUnlocked";
import { Plan, MilestoneProgress } from "@prisma/client";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";

// Update the Plan type to include the relation
type PlanWithMilestoneProgress = Plan & {
  milestoneProgress?: MilestoneProgress | null;
};

function getMilestones(plan: PlanWithMilestoneProgress): {
  milestoneGroups: MilestoneGroup[];
  currentSavings: number;
} {
  // Sử dụng dữ liệu từ milestoneProgress nếu có
  if (plan.milestoneProgress?.milestoneGroups) {
    try {
      const milestoneGroups = JSON.parse(JSON.stringify(plan.milestoneProgress.milestoneGroups));
      const currentSavings = plan.milestoneProgress.currentSavings;
      
      // Cập nhật trạng thái cho tất cả milestone groups
      const updatedMilestoneGroups = milestoneGroups.map((group: MilestoneGroup) => {
        const updatedMilestones = group.milestones.map(milestone => {
          if (currentSavings >= milestone.amountValue) {
            return { ...milestone, status: "done" as const };
          } else {
            return { ...milestone, status: "upcoming" as const };
          }
        });

        return {
          ...group,
          milestones: updatedMilestones
        };
      });

      // Sau đó, chỉ set 1 milestone duy nhất thành "current" và 1 group duy nhất thành "current"
      let foundCurrent = false;
      const finalMilestoneGroups = updatedMilestoneGroups.map((group: any) => {
        const finalMilestones = group.milestones.map((milestone: any) => {
          if (!foundCurrent && milestone.status === "upcoming") {
            // Tìm milestone đầu tiên chưa hoàn thành để set thành "current"
            foundCurrent = true;
            return { ...milestone, status: "current" as const };
          }
          return milestone;
        });

        // Cập nhật status tổng thể của group
        let groupStatus: "done" | "current" | "upcoming" = "upcoming";
        const allDone = finalMilestones.every((milestone: any) => milestone.status === "done");
        const hasCurrent = finalMilestones.some((milestone: any) => milestone.status === "current");
        
        if (allDone) {
          groupStatus = "done";
        } else if (hasCurrent) {
          groupStatus = "current";
        }

        return {
          ...group,
          milestones: finalMilestones,
          status: groupStatus,
        };
      });
      
      return { 
        milestoneGroups: finalMilestoneGroups,
        currentSavings 
      };
    } catch (error) {
      console.error("Error parsing milestone data from database:", error);
    }
  }

  // Fallback: tính toán mới nếu không có dữ liệu
  const projections = generateProjections(plan);
  
  const currentYear = new Date().getFullYear();
  const currentProjection = projections.find(p => p.year === currentYear) || projections[0];
  const currentSavings = currentProjection?.cumulativeSavings || 0;

  const purchaseProjection = projections.find(p => p.year === plan.confirmedPurchaseYear) || projections[0];

  const milestoneGroups = getMilestonesByGroup(
    plan.createdAt.getFullYear() + (plan.createdAt.getMonth() + 1) / 12,
    plan.confirmedPurchaseYear ?? 0 + (plan.createdAt.getMonth() + 1) / 12,
    purchaseProjection.housePriceProjected,
    currentSavings,
    plan // Thêm plan parameter
  );

  return { milestoneGroups, currentSavings };
}

// Add helper function to get roadmap image path
function getRoadmapImagePath(goalNumber: number, totalMilestones: number): string {
  
  // Trường hợp 11 cột mốc -> lấy tất cả 11 ảnh trong folder public/roadmap
  if (totalMilestones === 11) {
    // Đảm bảo goal number nằm trong khoảng 1-11
    const validGoalNumber = Math.min(Math.max(goalNumber, 1), 11);
    return `/roadmap/${validGoalNumber} miles.png`;
  }
  
  // Trường hợp 8 cột mốc -> giữ yên ảnh 1 và ảnh 11, các ảnh còn lại sẽ lấy các số từ 2->7 nhân với 11/8 và làm tròn
  if (totalMilestones === 8) {
    if (goalNumber === 1) {
      return `/roadmap/1 miles.png`;
    } else if (goalNumber === 8) {
      return `/roadmap/11 miles.png`;
    } else {
      // Các ảnh từ 2-7: nhân với 11/8 và làm tròn
      const imageNumber = Math.round((goalNumber - 1) * (11 / 8) + 1);
      const validImageNumber = Math.min(Math.max(imageNumber, 2), 10);
      return `/roadmap/${validImageNumber} miles.png`;
    }
  }
  
  // Trường hợp 6 cột mốc -> giữ yên ảnh 1 và ảnh 11, các ảnh còn lại sẽ lấy các số từ 2->5 nhân với 11/6 và làm tròn
  if (totalMilestones === 6) {
    if (goalNumber === 1) {
      return `/roadmap/1 miles.png`;
    } else if (goalNumber === 6) {
      return `/roadmap/11 miles.png`;
    } else {
      const imageNumber = Math.round((goalNumber - 1) * (11 / 6) + 1);
      const validImageNumber = Math.min(Math.max(imageNumber, 2), 10);
      return `/roadmap/${validImageNumber} miles.png`;
    }
  }
  
  // Fallback: trường hợp mặc định
  const validGoalNumber = Math.min(Math.max(goalNumber, 1), 11);
  return `/roadmap/${validGoalNumber} miles.png`;
}

export default function MilestoneTimeline({
  plan,
}: {
  plan: PlanWithMilestoneProgress;
}) {
  const spacingHeight = 150;
  const { milestoneGroups, currentSavings } = getMilestones(plan);

  return (
    <div className="container mx-auto max-w-5xl relative w-full md:p-4 mt-10 overflow-visible">
      {milestoneGroups.map((group, idx) => {
        const isLeft = idx % 2 === 0;
        const isFirst = idx === 0;
        const isLast = idx === milestoneGroups.length - 1;
        
        return (
          <div
            key={`${group.id}-${idx}`}
            className="flex w-full overflow-visible"
            style={{ height: `${spacingHeight}px` }}
          >
            {/* Node bên trái */}
            {isLeft ? (
              <>
                <div className="flex flex-1 justify-start">
                  <MilestoneNode 
                    plan={plan} 
                    group={group}
                    position="odd" 
                    isFirst={isFirst}
                    isLast={isLast}
                    currentSavings={currentSavings}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 flex justify-end">
                  <MilestoneNode 
                    plan={plan} 
                    group={group}
                    position="even" 
                    isFirst={isFirst}
                    isLast={isLast}
                    currentSavings={currentSavings}
                  />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MilestoneNode({
  plan, 
  group,
  position,
  isFirst,
  isLast,
  currentSavings,
}: {
  plan: PlanWithMilestoneProgress;
  group: MilestoneGroup;
  position: "odd" | "even";
  isFirst: boolean;
  isLast: boolean;
  currentSavings: number;
}) {
  const router = useRouter();
  const { milestoneGroups } = getMilestones(plan);
  
  // Tìm group trước đó để tính progress
  const currentGroupIndex = milestoneGroups.findIndex(g => g.id === group.id);
  let prevGroupAmountValue = 0;
  
  if (currentGroupIndex === 0) {
    // Group đầu tiên: sử dụng initialSavings
    prevGroupAmountValue = plan.initialSavings || 0;
  } else {
    // Các group khác: sử dụng amountValue lớn nhất của group trước đó
    const prevGroup = milestoneGroups[currentGroupIndex - 1];
    if (prevGroup && prevGroup.milestones.length > 0) {
      prevGroupAmountValue = Math.max(...prevGroup.milestones.map(m => m.amountValue));
    }
  }

  // Lấy amountValue lớn nhất của group hiện tại để tính progress và hiển thị mục tiêu
  const currentGroupMaxAmount = Math.max(...group.milestones.map(m => m.amountValue));
  
  const size = 80;
  const strokeWidth = 4;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let progress = 0;
  if (group.status === "current" && currentGroupMaxAmount != null) {
    const delta = currentSavings - prevGroupAmountValue;
    const target = currentGroupMaxAmount - prevGroupAmountValue;
    progress = Math.max(0, Math.min(delta / target, 1));
  }

  const handleClick = () => {
    console.log("MilestoneNode clicked:", group.title, "Goal:", group.id);
    
    if (group.status === "current") {
      const currentSubMilestoneIndex = group.milestones.findIndex(
        (m) => m.status === "current"
      );

      if (currentSubMilestoneIndex !== -1) {
        const step = currentSubMilestoneIndex + 1;
        router.push(
          `/plan/${plan.id}/plan?milestoneId=${group.id}&step=${step}`
        );
        return;
      }
    }

    router.push(`/plan/${plan.id}/plan?milestoneId=${group.id}`);
  };

  const totalMilestones = milestoneGroups.length;
  const roadmapImagePath = getRoadmapImagePath(group.id, totalMilestones);

  return (
    <div
      className={`flex flex-col items-center cursor-pointer relative z-10`}
      onClick={handleClick}
    >
      <div className={`milestone-node ${isLast ? 'last-child' : `${group.status} ${position}`} relative w-[80px] h-[80px] flex items-center justify-center`}>
        {!isFirst && (
          <div 
            className="absolute top-0 left-1/2 w-0.5 transform -translate-x-1/2"
            style={{ 
              top: '-110px',
              height: '110px',
              background: group.status === 'upcoming' 
                ? `repeating-linear-gradient(to bottom, #6b7280 0px, #6b7280 12px, transparent 12px, transparent 20px)`
                : `repeating-linear-gradient(to bottom, #06b6d4 0px, #06b6d4 12px, transparent 12px, transparent 20px)`
            }}
          />
        )}

        {group.status === "current" ? (
          <svg width={size} height={size} className="rotate-[-90deg]">
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#6b7280"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#06b6d4"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <div
            className={`w-full h-full rounded-full border-4 flex items-center justify-center ${
              group.status === "done"
                ? "border-cyan-500 bg-cyan-800"
                : "border-gray-600 bg-neutral-900"
            }`}
            style={{ position: "relative", width: 80, height: 80, overflow: "hidden" }}
          >
            <Image
              src={roadmapImagePath}
              alt={group.title}
              width={80}
              height={80}
              style={{
                objectFit: "contain",
                opacity: group.status === "done" ? 0.4 : 1,
                filter: group.status === "done" ? "blur(1px)" : "none",
                transition: "all 0.2s"
              }}
              className="rounded-full"
            />
            {group.status === "done" && (
              <span
                className="absolute inset-0 flex items-center justify-center text-5xl text-cyan-400"
                style={{
                  pointerEvents: "none",
                  fontWeight: "bold",
                  textShadow: "0 0 8px #000"
                }}
              >
                ✔
              </span>
            )}
          </div>
        )}

        {group.status === "current" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src={roadmapImagePath}
              alt={group.title}
              width={70}
              height={70}
              style={{
                objectFit: "contain",
                transition: "all 0.2s"
              }}
              className="rounded-full"
            />
          </div>
        )}
      </div>

      <div className="text-sm mt-2 font-bold text-center">
        {group.title}
      </div>

      <div className="text-slate-300 text-sm text-center">
        {currentGroupMaxAmount != null ? (
          currentGroupMaxAmount >= 1000000000 ? (
            `Tích lũy đạt ${(currentGroupMaxAmount / 1000000000).toFixed()} tỷ`
          ) : currentGroupMaxAmount >= 1000000 ? (
            `Tích lũy đạt ${(currentGroupMaxAmount / 1000000).toFixed()} triệu`
          ) : (
            `Tích lũy đạt ${Math.round(currentGroupMaxAmount).toFixed().toLocaleString()} triệu`
          )
        ) : (
          "Tích lũy đạt mục tiêu"
        )}
      </div>
    </div>
  );
}
