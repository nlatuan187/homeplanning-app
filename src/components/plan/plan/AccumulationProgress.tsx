"use client";

import React from "react";

interface AccumulationProgressProps {
  current: number;
  min: number;
  max: number;
  estimateText: string; // ví dụ: "Thời gian ước lượng: 1 tháng (7.2025 - 8.2025)"
}

export default function AccumulationProgress({
  current,
  min,
  max,
  estimateText,
}: AccumulationProgressProps) {
  const percent = Math.min(100, Math.max(0, ((current - min) / (max - min)) * 100));

  return (
    <div className="bg-white rounded-lg p-6 text-center shadow">
      <div className="text-sm text-slate-500 italic">{estimateText}</div>
      <div className="text-3xl font-bold text-cyan-500 my-2">{current}</div>

      {/* Thanh tiến độ với phần trăm nằm giữa */}
      <div className="relative w-full h-6 bg-slate-200 rounded-full overflow-hidden my-2">
        <div
          className="absolute left-0 top-0 h-full bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        >
          {Math.round(percent)}%
        </div>
      </div>

      {/* Min - Max ở dưới thanh */}
      <div className="flex justify-between text-sm text-slate-600 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
