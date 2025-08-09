"use client";

import React from "react";

interface AccumulationProgressProps {
  current: number;
  min: number;
  max: number;
  estimateText: string;
}

// Hàm helper để làm tròn số với 1 chữ số sau dấu phẩy
const roundToDecimal = (value: number): number => {
  return Math.round(value * 10) / 10;
};

// Hàm helper để format số tiền với đơn vị triệu/tỷ
const formatAmount = (amount: number): string => {
  if (amount >= 1000000000) {
    return `${roundToDecimal(amount / 1000000000)} tỷ`;
  } else if (amount >= 1000000) {
    return `${roundToDecimal(amount / 1000000)} triệu`;
  } else {
    return `${Math.round(amount).toLocaleString()}`;
  }
};

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
      <div className="text-3xl font-bold text-cyan-500 my-2">{formatAmount((current * 1000000))}</div>

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
        <span>{formatAmount(min * 1000000)}</span>
        <span>{formatAmount(max * 1000000)}</span>
      </div>
    </div>
  );
}
