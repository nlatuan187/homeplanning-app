import { useEffect } from "react";

interface LoadingStepProps {
  onLoadingComplete: () => void;
}

export default function LoadingStep({ onLoadingComplete }: LoadingStepProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onLoadingComplete();
    }, 3000); // Simulate 3-second calculation

    return () => clearTimeout(timer);
  }, [onLoadingComplete]);

  return (
    <div className="flex flex-col items-center justify-center text-center h-full flex-grow">
      {/* You can add a spinner or animation here */}
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-white mb-6"></div>
      <h2 className="text-2xl font-bold text-white">Đang bận rộn tính toán...</h2>
    </div>
  );
}
