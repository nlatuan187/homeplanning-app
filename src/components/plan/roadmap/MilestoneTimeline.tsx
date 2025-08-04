"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getMilestonesByGroup, Milestone } from "@/lib/isMilestoneUnlocked ";
import { Plan } from "@prisma/client";
import { ProjectionRow } from "@/lib/calculations/affordability";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";

function getMilestones(plan: Plan)  {
  const projections = generateProjections(plan);
  
  const currentYear = new Date().getFullYear();
  const currentProjection = projections.find(p => p.year === currentYear) || projections[0];
  
  const currentSavings = currentProjection?.cumulativeSavings || 0;

  const milestones = getMilestonesByGroup(
    plan.createdAt.getFullYear() + (plan.createdAt.getMonth() + 1) / 12,
    plan.confirmedPurchaseYear ?? 0 + (plan.createdAt.getMonth() + 1) / 12,
    plan.targetHousePriceN0,
    currentSavings
  );

  return { milestones, currentSavings };
}

export default function MilestoneTimeline({
  plan,
}: {
  plan: Plan;
}) {
  const spacingHeight = 150;
  const router = useRouter();
  const { milestones, currentSavings } = getMilestones(plan);

  console.log("milestones", milestones)

  const lastDoneIdx = milestones.findLastIndex((m) => m.status === "done");
  const currentIdx = milestones.findIndex((m) => m.status === "current");

  return (
    <div className="relative w-full mt-10">
      <svg
        className="absolute left-0 top-0 w-full h-full z-0"
        viewBox={`0 0 100 ${milestones.length * spacingHeight}`}
        preserveAspectRatio="none"
      >
        {milestones.map((m, idx) => {
          if (idx === milestones.length - 1) return null;

          const isEven = (idx + 1) % 2 === 0;
          const x1 = isEven ? 80 : 20;
          const x2 = isEven ? 20 : 80;
          const y1 = idx * spacingHeight + 40;
          const y2 = (idx + 1) * spacingHeight + 40;

          const isGreenLine =
            (m.status === "done" && milestones[idx + 1].status === "done") ||
            (idx === lastDoneIdx && idx + 1 === currentIdx);

          return (
            <path
              key={idx}
              d={`M${x1},${y1} L${x2},${y2}`}
              stroke={isGreenLine ? "#06b6d4" : "#6b7280"}
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="1 1"
            />
          );
        })}
      </svg>

      {milestones.map((m, idx) => {
        const isEven = (idx + 1) % 2 === 0;

        return (
          <div
            key={m.id}
            className={`relative flex items-center mb-24 z-10`}
            style={{ height: `${spacingHeight}px` }}
          >
            <div className={`w-1/2 flex ${!isEven ? "justify-center" : ""}`}>
              {!isEven && (
                <MilestoneNode
                  plan={plan}
                  m={m}
                  onClick={() => router.push(`plan`)}
                />
              )}
            </div>
            <div className={`w-1/2 flex ${isEven ? "justify-center" : ""}`}>
              {isEven && (
                <MilestoneNode
                  plan={plan}
                  m={m}
                  onClick={() => router.push(`plan`)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MilestoneNode({
  plan, 
  m,
  onClick,
}: {
  plan: Plan;
  m: Milestone;
  onClick?: () => void;
}) {
  const { milestones, currentSavings } = getMilestones(plan);
  const lastDoneMilestone = milestones
    .filter(milestone => milestone.status === "done")
    .sort((a, b) => (b.amountValue || 0) - (a.amountValue || 0))[0];
  
  const lastDoneAmountValue = lastDoneMilestone?.amountValue || 0;

  const radius = 60 / 2;
  const strokeWidth = 4;
  const center = radius + strokeWidth;
  const circumference = 2 * Math.PI * radius;

  let progress = 0;
  if (m.status === "current" && m.amountValue != null) {
    const delta = currentSavings - lastDoneAmountValue;
    const target = m.amountValue - lastDoneAmountValue;
    progress = Math.max(0, Math.min(delta / target, 1));
  }

  const handleClick = () => {
    console.log("MilestoneNode clicked:", m.title); // Debug log
    
    // Lưu data vào localStorage thay vì URL
    const stateData = {
      title: m.title,
      status: m.status,
      percent: m.percent,
      amountValue: m.amountValue,
      currentSavings,
      lastDoneAmountValue,
      progress
    };
    
    console.log("Saving milestone data:", stateData); // Debug log
    
    // Lưu vào localStorage với key unique
    localStorage.setItem(`milestoneData_${plan.id}`, JSON.stringify(stateData));
    
    console.log("Data saved to localStorage with key:", `milestoneData_${plan.id}`); // Debug log
    
    // Navigate với URL sạch
    window.location.href = `/plan/${plan.id}/plan`;
  };

  return (
    <div className="flex flex-col items-center cursor-pointer" onClick={handleClick}>
      <div className="relative w-[60px] h-[60px]">
        {m.status === "current" ? (
          <svg width="68" height="68" className="rotate-[-90deg]">
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
          >
            {m.status === "done" ? (
              <span className="text-3xl">✔</span>
            ) : (
              <Image
                src={m.icon || "/default-icon.png"}
                alt={m.title}
                width={32}
                height={32}
              /> 
            )}
          </div>
        )}

        {m.status === "current" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src={m.icon || "/default-icon.png"}
              alt={m.title}
              width={32}
              height={32}
            />
          </div>
        )}
      </div>

      <div className="text-sm mt-2 font-bold">
        {m.title}
      </div>

      <div className="text-slate-300 text-sm">
        {m.title === "Goal 1" || m.title === "Goal 2" ? (
          m.amount
        ) : m.amountValue != null ? (
          m.amountValue >= 1000 ? (
            `Tích lũy đạt ${(m.amountValue / 1000).toFixed(2)} tỷ`
          ) : (
            `Tích lũy đạt ${Math.round(m.amountValue).toLocaleString()} triệu`
          )
        ) : null}
      </div>
    </div>
  );
}
