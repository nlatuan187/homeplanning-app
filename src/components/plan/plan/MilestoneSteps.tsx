"use client";

import React from "react";
import { Check } from "lucide-react";

interface MilestoneStepsProps {
  totalSteps: number;
  currentStep: number;
  milestones?: {
    groupId: number;
    status: "done" | "current" | "upcoming";
    amountValue: number;
  }[];
  onStepClick: (step: number) => void;
}

export default function MilestoneSteps({ totalSteps, currentStep, milestones, onStepClick }: MilestoneStepsProps) {
  return (
    <div className="w-full py-4 px-4">
      {/* Container full width với justify-between */}
      <div className="flex items-center justify-between w-full">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const milestone = milestones?.[i];
          
          // Xác định trạng thái dựa vào milestone data nếu có
          let isCompleted = false;
          let isCurrent = false;
          
          if (milestones && milestone) {
            // Sử dụng status từ milestone data
            isCompleted = milestone.status === "done";
            isCurrent = milestone.status === "current";
          } else {
            // Fallback về logic cũ
            isCompleted = step < currentStep;
            isCurrent = step === currentStep;
          }

          return (
            <React.Fragment key={step}>
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer hover:scale-110
                  ${isCompleted ? "bg-cyan-500 text-white border-cyan-500" : ""}
                  ${isCurrent ? "text-cyan-500 border-cyan-500" : ""}
                  ${!isCompleted && !isCurrent ? "text-white border-white/50" : ""}
                `}
                onClick={() => onStepClick(step)}
              >
                {isCompleted ? <Check size={28} /> : <span className="text-xl font-semibold">{step}</span>}
              </div>
              {/* Không cần line riêng nếu dùng justify-between, 
                   nhưng nếu muốn line vẫn hiển thị thì dùng absolute hoặc flex-grow */}
              {step !== totalSteps && (
                <div className="flex-grow h-0.5 border-t border-dashed border-white/40 mx-3"></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
