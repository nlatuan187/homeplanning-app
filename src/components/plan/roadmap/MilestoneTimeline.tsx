"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getMilestonesByGroup, Milestone } from "@/lib/isMilestoneUnlocked ";

export default function MilestoneTimeline({
  timeStart,
  confirmPurchaseYear,
  homePrice,
  currentSavings,
}: {
  timeStart: number;
  confirmPurchaseYear: number;
  homePrice: number;
  currentSavings: number;
}) {
  const spacingHeight = 150;
  const router = useRouter();

  const milestones = getMilestonesByGroup(
    timeStart,
    confirmPurchaseYear,
    homePrice,
    currentSavings
  );

  const lastDoneIdx = milestones.findLastIndex((m) => m.status === "done");
  const currentIdx = milestones.findIndex((m) => m.status === "current");
  const lastDoneMilestone = [...milestones]
    .reverse()
    .find((m) => m.status === "done" && m.amountValue != null);
  const lastDoneAmountValue = lastDoneMilestone?.amountValue ?? 0;

  const delta = m.amountValue - lastDoneAmountValue;
  const monthlySaving = someEstimatedMonthlySavings(); // bạn phải tính hoặc truyền vào
  const estimatedDuration = Math.ceil(delta / monthlySaving);

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
                  m={m}
                  currentSavings={currentSavings}
                  lastDoneAmountValue={lastDoneAmountValue}
                  onClick={() => {
                    router.push(`/plan?milestoneId=${m.id}`, {
                      scroll: false,
                    });

                    // Option 1: dùng sessionStorage để truyền dữ liệu
                    sessionStorage.setItem(
                      `milestoneData-${m.id}`,
                      JSON.stringify({
                        currentSavings,
                        amountStart: lastDoneAmountValue,
                        amountTarget: m.amountValue ?? 0,
                        estimatedDuration: m.estimatedDuration ?? 0,
                      })
                    );
                  }}
                />
              )}
            </div>
            <div className={`w-1/2 flex ${isEven ? "justify-center" : ""}`}>
              {isEven && (
                <MilestoneNode
                  m={m}
                  currentSavings={currentSavings}
                  lastDoneAmountValue={lastDoneAmountValue}
                  onClick={() => router.push(`/plan?milestoneId=${m.id}`)}
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
  m,
  currentSavings,
  lastDoneAmountValue,
  onClick,
}: {
  m: Milestone;
  currentSavings: number;
  lastDoneAmountValue: number;
  onClick?: () => void;
}) {
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

  return (
    <div className="flex flex-col items-center cursor-pointer" onClick={onClick}>
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

      <div className="text-slate-300 text-sm mt-2">
        {m.title === "Goal 1" || m.title === "Goal 2" ? (
          m.amount
        ) : m.amountValue != null ? (
          m.amountValue / 1e6 > 1000 ? (
            `Tích lũy đạt ${(m.amountValue / 1e9).toFixed(2)} tỷ`
          ) : (
            `Tích lũy đạt ${Math.round(m.amountValue / 1e6).toLocaleString()} triệu`
          )
        ) : null}
      </div>
    </div>
  );
}
