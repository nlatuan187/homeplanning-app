"use client";

import { useEffect, useState } from "react";

interface LoadingStepProps {
  title?: string;
  message?: string;
  percentage?: number; // This is the target percentage
}

export default function LoadingStep({ title, message, percentage }: LoadingStepProps) {
  const [currentPercentage, setCurrentPercentage] = useState(0);
  const spinnerColor = "#00ACB8"; // Finful cyan color

  useEffect(() => {
    if (percentage === undefined) return;

    // Animate from the current percentage to the target percentage
    if (currentPercentage < percentage) {
      const animationSpeed = 40; // milliseconds per step, lower is faster
      const timer = setTimeout(() => {
        setCurrentPercentage(prev => prev + 1);
      }, animationSpeed);

      return () => clearTimeout(timer);
    }
  }, [percentage, currentPercentage]);

  return (
    <div className="flex flex-col items-center justify-center text-center h-full flex-grow">
      {title && <div className="absolute top-5 left-1/2 -translate-x-1/2 font-semibold text-white text-lg">{title}</div>}
      
      <div className="mb-8 relative">
        <svg 
          className="animate-spin h-16 w-16 md:h-20 md:w-20" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
            style={{ color: spinnerColor }}
          ></circle>
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            style={{ color: spinnerColor }}
          ></path>
        </svg>
        {percentage !== undefined && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-xl font-bold">{Math.round(currentPercentage)}%</span>
          </div>
        )}
      </div>
      
      <h2 className="text-xl font-semibold text-white">{message || "Đang bận rộn tính toán"}...</h2>
    </div>
  );
}
