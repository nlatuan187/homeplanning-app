// src/components/ui/LottieAnimation.tsx
"use client";

import Lottie from "lottie-react";
import { CSSProperties } from "react";

interface LottieAnimationProps {
  // `animationData` sẽ nhận trực tiếp nội dung file JSON
  animationData: object;
  // Cho phép tùy chỉnh class và style
  className?: string;
  style?: CSSProperties;
  // Các tùy chọn điều khiển animation
  loop?: boolean;
  autoplay?: boolean;
  onComplete?: () => void; // Thêm prop onComplete
}

const LottieAnimation = ({
  animationData,
  className,
  style,
  loop = true,
  autoplay = true,
  onComplete, // Nhận prop onComplete
}: LottieAnimationProps) => {
  return (
    <Lottie
      animationData={animationData}
      className={className}
      style={style}
      loop={loop}
      autoplay={autoplay}
      onComplete={onComplete} // Truyền vào component Lottie
    />
  );
};

export default LottieAnimation;