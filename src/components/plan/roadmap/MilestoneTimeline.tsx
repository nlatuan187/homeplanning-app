"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getMilestonesByGroup, Milestone } from "@/lib/isMilestoneUnlocked";
import { Plan, MilestoneProgress } from "@prisma/client";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";

// Update the Plan type to include the relation
type PlanWithMilestoneProgress = Plan & {
  milestoneProgress?: MilestoneProgress | null;
};

function getMilestones(plan: PlanWithMilestoneProgress): {
  milestones: Milestone[];
  currentSavings: number;
  milestoneGroups: any[];
} {
  // Sử dụng dữ liệu từ milestoneProgress nếu có
  if (plan.milestoneProgress?.milestoneGroups) {
    try {
      const milestoneGroups = JSON.parse(JSON.stringify(plan.milestoneProgress.milestoneGroups));
      const currentSavings = plan.milestoneProgress.currentSavings;
      
      // Flatten tất cả milestones để tính toán trạng thái
      const allMilestones = milestoneGroups.flatMap((group: any) => group.milestones);
      
      // Sắp xếp theo amountValue để đảm bảo thứ tự đúng
      const sortedMilestones = allMilestones.sort((a: Milestone, b: Milestone) => 
        (a.amountValue || 0) - (b.amountValue || 0)
      );
      
      // Cập nhật trạng thái cho tất cả milestones
      const updatedMilestones = sortedMilestones.map((milestone: Milestone) => {
        const milestoneAmount = milestone.amountValue || 0;
        
        if (currentSavings >= milestoneAmount) {
          return { ...milestone, status: "done" as const };
        } else {
          // Tìm milestone đầu tiên chưa hoàn thành để set thành "current"
          const firstIncompleteMilestone = sortedMilestones.find((m: Milestone) => 
            (m.amountValue || 0) > currentSavings
          );
          
          return { 
            ...milestone, 
            status: milestone === firstIncompleteMilestone ? "current" as const : "upcoming" as const 
          };
        }
      });
      
      // Cập nhật lại milestoneGroups với trạng thái mới
      const updatedMilestoneGroups = milestoneGroups.map((group: any) => {
        const updatedGroupMilestones = group.milestones.map((groupMilestone: Milestone) => {
          // Tìm milestone tương ứng trong updatedMilestones
          const updatedMilestone = updatedMilestones.find((m: Milestone) => 
            m.title === groupMilestone.title && 
            m.amountValue === groupMilestone.amountValue &&
            m.percent === groupMilestone.percent
          );
          
          return updatedMilestone || groupMilestone;
        });
        
        return {
          ...group,
          milestones: updatedGroupMilestones
        };
      });
      
      return {
        milestones: updatedMilestones,
        currentSavings,
        milestoneGroups: updatedMilestoneGroups
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

  // Flatten milestones từ các groups để tương thích với logic hiện tại
  const flattenedMilestones = milestoneGroups.flatMap(group => group.milestones);

  return { milestones: flattenedMilestones, currentSavings, milestoneGroups };
}

// Add helper function to get goal number from title
function getGoalNumber(title: string): number {
  // Tìm pattern "Cột mốc số X" hoặc "Goal X"
  const match = title.match(/(?:Cột mốc số|Goal)\s+(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// Add helper function to get roadmap image path
function getRoadmapImagePath(goalNumber: number, totalMilestones: number): string {
  console.log(`DEBUG: getRoadmapImagePath called with goalNumber=${goalNumber}, totalMilestones=${totalMilestones}`);
  
  // Trường hợp 11 cột mốc -> lấy tất cả 11 ảnh trong folder public/roadmap
  if (totalMilestones === 11) {
    // Đảm bảo goal number nằm trong khoảng 1-11
    const validGoalNumber = Math.min(Math.max(goalNumber, 1), 11);
    console.log(`DEBUG: 11 milestones case, using image ${validGoalNumber}`);
    return `/roadmap/${validGoalNumber} miles.png`;
  }
  
  // Trường hợp 8 cột mốc -> giữ yên ảnh 1 và ảnh 11, các ảnh còn lại sẽ lấy các số từ 2->7 nhân với 11/8 và làm tròn
  if (totalMilestones === 8) {
    if (goalNumber === 1) {
      console.log(`DEBUG: 8 milestones case, goal 1 -> image 1`);
      return `/roadmap/1 miles.png`;
    } else if (goalNumber === 8) {
      console.log(`DEBUG: 8 milestones case, goal 8 -> image 11`);
      return `/roadmap/11 miles.png`;
    } else {
      // Các ảnh từ 2-7: nhân với 11/8 và làm tròn
      const imageNumber = Math.round((goalNumber - 1) * (11 / 8) + 1);
      const validImageNumber = Math.min(Math.max(imageNumber, 2), 10);
      console.log(`DEBUG: 8 milestones case, goal ${goalNumber} -> image ${validImageNumber} (calculated: ${imageNumber})`);
      return `/roadmap/${validImageNumber} miles.png`;
    }
  }
  
  // Trường hợp 6 cột mốc -> giữ yên ảnh 1 và ảnh 11, các ảnh còn lại sẽ lấy các số từ 2->5 nhân với 11/6 và làm tròn
  if (totalMilestones === 6) {
    if (goalNumber === 1) {
      console.log(`DEBUG: 6 milestones case, goal 1 -> image 1`);
      return `/roadmap/1 miles.png`;
    } else if (goalNumber === 6) {
      console.log(`DEBUG: 6 milestones case, goal 6 -> image 11`);
      return `/roadmap/11 miles.png`;
    } else {
      // Các ảnh từ 2-5: nhân với 11/6 và làm tròn
      const imageNumber = Math.round((goalNumber - 1) * (11 / 6) + 1);
      const validImageNumber = Math.min(Math.max(imageNumber, 2), 10);
      console.log(`DEBUG: 6 milestones case, goal ${goalNumber} -> image ${validImageNumber} (calculated: ${imageNumber})`);
      return `/roadmap/${validImageNumber} miles.png`;
    }
  }
  
  // Fallback: trường hợp mặc định
  const validGoalNumber = Math.min(Math.max(goalNumber, 1), 11);
  console.log(`DEBUG: fallback case, goal ${goalNumber} -> image ${validGoalNumber}`);
  return `/roadmap/${validGoalNumber} miles.png`;
}

export default function MilestoneTimeline({
  plan,
}: {
  plan: PlanWithMilestoneProgress;
}) {
  const spacingHeight = 150;
  const { milestones, currentSavings, milestoneGroups } = getMilestones(plan);

  return (
    <div className="container mx-auto max-w-5xl relative w-full mt-10 overflow-visible">
      {milestones.map((m: Milestone, idx: number) => {
        const isLeft = idx % 2 === 0;
        const isFirst = idx === 0;
        const isLast = idx === milestones.length - 1;
        
        return (
          <div
            key={`${getGoalNumber(m.title)}-${idx}`}
            className="flex w-full overflow-visible"
            style={{ height: `${spacingHeight}px` }}
          >
            {/* Node bên trái */}
            {isLeft ? (
              <>
                <div className="flex flex-1 justify-center pr-150">
                  <MilestoneNode 
                    plan={plan} 
                    m={m} 
                    position="odd" 
                    isFirst={isFirst}
                    isLast={isLast}
                    currentSavings={currentSavings}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 flex justify-center pl-150">
                  <MilestoneNode 
                    plan={plan} 
                    m={m} 
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
  m,
  position,
  isFirst,
  isLast,
  currentSavings,
}: {
  plan: PlanWithMilestoneProgress;
  m: Milestone;
  position: "odd" | "even";
  isFirst: boolean;
  isLast: boolean;
  currentSavings: number;
}) {
  const router = useRouter();
  const { milestones } = getMilestones(plan);
  
  // Tìm milestone trước đó để tính progress
  const currentMilestoneIndex = milestones.findIndex(milestone => milestone.title === m.title);
  let prevMilestoneAmountValue = 0;
  
  if (currentMilestoneIndex === 0) {
    // Milestone đầu tiên: sử dụng initialSavings
    prevMilestoneAmountValue = plan.initialSavings || 0;
  } else {
    // Các milestone khác: sử dụng amountValue của milestone trước đó
    const prevMilestone = milestones[currentMilestoneIndex - 1];
    prevMilestoneAmountValue = prevMilestone?.amountValue || 0;
  }

  const size = 80;
  const strokeWidth = 4;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let progress = 0;
  if (m.status === "current" && m.amountValue != null) {
    const delta = currentSavings - prevMilestoneAmountValue;
    const target = m.amountValue - prevMilestoneAmountValue;
    progress = Math.max(0, Math.min(delta / target, 1));
  }

  const handleClick = () => {
    console.log("MilestoneNode clicked:", m.title, "ID:", getGoalNumber(m.title));
    
    // Lấy milestone ID từ title (Goal X -> X)
    const milestoneId = getGoalNumber(m.title);
    
    // Chuyển đến trang plan với milestone ID
    router.push(`/plan/${plan.id}/plan?milestoneId=${milestoneId}`);
  };

  // Get the roadmap image path based on goal number and total milestones
  const goalNumber = getGoalNumber(m.title);
  const totalMilestones = milestones.length;
  const roadmapImagePath = getRoadmapImagePath(goalNumber, totalMilestones);
  
  console.log(`DEBUG: MilestoneNode for "${m.title}" - goalNumber=${goalNumber}, totalMilestones=${totalMilestones}, imagePath=${roadmapImagePath}`);

  // Tạo màu sắc cho đường kẻ dựa trên trạng thái
  const getLineColor = () => {
    if (m.status === 'done') return '#06b6d4';
    if (m.status === 'current') return '#06b6d4';
    return '#6b7280';
  };

  return (
    <div
      className={`flex flex-col items-center cursor-pointer relative z-10`}
      onClick={handleClick}
    >
      <div className={`milestone-node ${isLast ? 'last-child' : `${m.status} ${position}`} relative w-[80px] h-[80px] flex items-center justify-center`}>
        {!isFirst && (
          <div 
            className="absolute top-0 left-1/2 w-0.5 transform -translate-x-1/2"
            style={{ 
              top: '-110px',
              height: '110px',
              background: m.status === 'upcoming' 
                ? `repeating-linear-gradient(to bottom, #6b7280 0px, #6b7280 12px, transparent 12px, transparent 20px)`
                : `repeating-linear-gradient(to bottom, #06b6d4 0px, #06b6d4 12px, transparent 12px, transparent 20px)`
            }}
          />
        )}

        {m.status === "current" ? (
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
              m.status === "done"
                ? "border-cyan-500 bg-cyan-800"
                : "border-gray-600 bg-neutral-900"
            }`}
            style={{ position: "relative", width: 80, height: 80, overflow: "hidden" }}
          >
            <Image
              src={roadmapImagePath}
              alt={m.title}
              width={80}
              height={80}
              style={{
                objectFit: "contain",
                opacity: m.status === "done" ? 0.4 : 1,
                filter: m.status === "done" ? "blur(1px)" : "none",
                transition: "all 0.2s"
              }}
              className="rounded-full"
            />
            {m.status === "done" && (
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

        {m.status === "current" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src={roadmapImagePath}
              alt={m.title}
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
        {m.title}
      </div>

      <div className="text-slate-300 text-sm text-center">
        {m.amountValue != null ? (
          m.amountValue >= 1000000000 ? (
            `Tích lũy đạt ${(m.amountValue / 1000000000).toFixed(1)} tỷ`
          ) : m.amountValue >= 1000000 ? (
            `Tích lũy đạt ${(m.amountValue / 1000000).toFixed(1)} triệu`
          ) : (
            `Tích lũy đạt ${Math.round(m.amountValue).toLocaleString()}`
          )
        ) : (
          "Tích lũy đạt mục tiêu"
        )}
      </div>
    </div>
  );
}
