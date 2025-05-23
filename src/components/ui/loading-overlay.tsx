"use client";

import { useState, useEffect } from 'react';

interface LoadingOverlayProps {
  messages: string[];
  durations?: number[]; // Optional: duration for each message in ms
  onSequenceComplete: () => void;
  spinnerColor?: string; // Optional: hex color for the spinner
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  messages,
  durations,
  onSequenceComplete,
  spinnerColor = "#00ACB8", // Default Finful cyan
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (currentMessageIndex >= messages.length) {
      onSequenceComplete();
      return;
    }

    const duration = durations?.[currentMessageIndex] || 1000; // Default 1s if not specified

    const timer = setTimeout(() => {
      setCurrentMessageIndex(prevIndex => prevIndex + 1);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentMessageIndex, messages, durations, onSequenceComplete]);

  if (currentMessageIndex >= messages.length) {
    return null; // All messages shown, component can unmount or be hidden by parent
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col justify-center items-center z-50 p-8">
      <div className="mb-8">
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
      </div>
      <p className="text-white text-lg md:text-xl text-center">
        {messages[currentMessageIndex]}
      </p>
    </div>
  );
};

export default LoadingOverlay;
