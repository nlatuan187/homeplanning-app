// ✅ FinancialSliders.tsx không cần chỉnh sửa khi chuyển sang dùng useReducer ở PlaygroundB
"use client";

import React, { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

export type SliderItem = {
  label: string;
  value: number;
  setValue: (val: number) => void;
  onInteraction?: () => void;
  suffix: string;
  max: number;
};

export type FinancialSlidersProps = {
  items: SliderItem[];
};

export default function FinancialSliders({ items }: FinancialSlidersProps) {
  return (
    <div className="container mx-auto max-w-5xl pt-8 text-sm sm:text-xs">
      <div className="space-y-3">
        {items.map((item, idx) => (
          <SliderWithDebounce key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}

function SliderWithDebounce({ item }: { item: SliderItem }) {
  const [localValue, setLocalValue] = useState(item.value);
  const debouncedValue = useDebounce(localValue, 300);

  const handleInitialInteraction = () => {
    item.onInteraction?.();
  };

  useEffect(() => {
    if (debouncedValue !== item.value) {
      item.setValue(debouncedValue);
      handleInitialInteraction();
    }
  }, [debouncedValue]);

  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        min={0}
        max={item.max}
        value={localValue}
        onChange={(e) => setLocalValue(Number(e.target.value))}
        className="flex-1 h-2 accent-cyan-500"
      />
      <div className="w-14 text-center font-semibold text-white whitespace-nowrap">
        {localValue}
        {item.suffix}
      </div>
    </div>
  );
}