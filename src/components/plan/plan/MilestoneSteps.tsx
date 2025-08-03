"use client";

import React from "react";
import { Check } from "lucide-react";

interface MilestoneStepsProps {
  totalSteps: number;
  currentStep: number;
}

export default function MilestoneSteps({ totalSteps, currentStep }: MilestoneStepsProps) {
  return (
    <div className="w-full flex items-center justify-between py-4 px-4">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;

        return (
          <React.Fragment key={step}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0
                ${isCompleted ? "bg-cyan-500 text-white border-cyan-500" : ""}
                ${isCurrent ? "text-cyan-500 border-cyan-500" : ""}
                ${!isCompleted && !isCurrent ? "text-white border-white/50" : ""}
              `}
            >
              {isCompleted ? <Check size={18} /> : step}
            </div>

            {step !== totalSteps && (
              <div
                className={`
                  h-0.5 border-t border-dashed border-white/40
                  w-6 sm:w-10 md:w-16 lg:w-24 xl:w-32
                  mx-1 sm:mx-2
                `}
              ></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
