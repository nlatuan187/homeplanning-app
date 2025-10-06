// ✅ FinancialSliders.tsx không cần chỉnh sửa khi chuyển sang dùng useReducer ở PlaygroundB
"use client";

import React, { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

export type ColorRange = {
  min: number;
  max: number;
  color: string;
  isLast?: boolean;
};

export type SliderItem = {
  label: string;
  value: number;
  setValue: (val: number) => void;
  onInteraction?: () => void;
  suffix: string;
  min: number;
  max: number;
  step?: number;
  isCustom?: boolean; // Flag to enable custom styling
  colorRanges?: ColorRange[];
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

  // Thêm effect này để đồng bộ localValue khi item.value thay đổi
  useEffect(() => {
    setLocalValue(item.value);
  }, [item.value]);

  const handleInitialInteraction = () => {
    item.onInteraction?.();
  };

  useEffect(() => {
    if (debouncedValue !== item.value) {
      item.setValue(debouncedValue);
      handleInitialInteraction();
    }
  }, [debouncedValue]);

  if (item.isCustom) {
    const getCurrentColor = () => {
      if (!item.colorRanges) return '#06b6d4'; // Fallback to cyan
      
      const range = item.colorRanges.find(r => {
        if (r.isLast) {
          return localValue >= r.min && localValue <= r.max;
        }
        return localValue >= r.min && localValue < r.max;
      });

      return range?.color || '#334155'; // Fallback to a neutral color
    };

    const color = getCurrentColor();
    
    const sliderStyle = {
      '--thumb-color': color,
    } as React.CSSProperties;

    const inactiveColor = '#334155'; // slate-700
    const createDynamicGradient = () => {
        if (!item.colorRanges) {
            return `linear-gradient(to right, ${inactiveColor}, ${inactiveColor})`;
        }

        const totalRange = item.max - item.min;
        if (totalRange <= 0) {
            return `linear-gradient(to right, ${inactiveColor}, ${inactiveColor})`;
        }
        
        const fillPercentage = ((localValue - item.min) / totalRange) * 100;
        const colorStops = [];

        for (const range of item.colorRanges) {
            const rangeStartPercentage = ((range.min - item.min) / totalRange) * 100;
            const rangeEndPercentage = ((range.max - item.min) / totalRange) * 100;

            if (fillPercentage > rangeStartPercentage) {
                const stopPercentage = Math.min(fillPercentage, rangeEndPercentage);
                colorStops.push(`${range.color} ${rangeStartPercentage}%`);
                colorStops.push(`${range.color} ${stopPercentage}%`);
            }
        }

        colorStops.push(`${inactiveColor} ${fillPercentage}%`);
        colorStops.push(`${inactiveColor} 100%`);
        
        return `linear-gradient(to right, ${colorStops.join(', ')})`;
    };

    const trackStyle = {
      background: createDynamicGradient(),
    };

    return (
      <div className="flex items-center">
        <div className="relative flex-1 h-8 flex items-center">
          <div 
            className="absolute w-full h-2 rounded-full z-0"
            style={trackStyle}
          ></div>
          <input
            type="range"
            min={item.min}
            max={item.max}
            step={item.step || 1}
            value={localValue}
            onChange={(e) => {
              e.stopPropagation();
              setLocalValue(Number(e.target.value));
            }}
            className="custom-slider w-full"
            style={sliderStyle}
          />
        </div>
        <div className="w-24 text-center font-semibold text-white whitespace-nowrap px-3">
          <span>{localValue}</span>
          <span>{item.suffix}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <input
        type="range"
        min={item.min}
        max={item.max}
        step={item.step || 1}
        value={localValue}
        onChange={(e) => {
          e.stopPropagation();
          setLocalValue(Number(e.target.value));
        }}
        className="flex-1 h-2 accent-cyan-500"
      />
      <div className="w-14 text-center font-semibold text-white whitespace-nowrap">
        {localValue}
        {item.suffix}
      </div>
    </div>
  );
}