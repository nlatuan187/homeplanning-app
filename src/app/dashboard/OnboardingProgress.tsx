"use client"; // Mark as a client component as it's used within one

import { OnboardingProgress, OnboardingSectionState } from '@prisma/client';
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { toast } from "react-hot-toast"; // Added for toast notifications
import { cn } from "@/lib/utils"; // Added for conditional class names

interface OnboardingProgressDisplayProps {
  planId: string;
  progress: OnboardingProgress | null;
}

// Configuration for each onboarding section card
const sectionConfig = {
  familySupport: {
    title: "Nguồn lực hỗ trợ",
    image: "/icons/suitcase 2.png",
    link: "familysupport",
    backgroundImage: "url('/onboarding/card2bg.png')", 
  },
  spending: {
    title: "Dòng tiền đi ra",
    image: "/icons/suitcase 3.png",
    link: "spending",
    backgroundImage: "url('/onboarding/card3bg.png')", 
  },
  assumption: {
    title: "Giả định & Chiến lược",
    image: "/icons/suitcase 4.png",
    link: "assumption",
    backgroundImage: "url('/onboarding/card4bg.png')", 
  },
};

/**
 * Renders the status button based on the section's state and progress percentage.
 */
const StatusButton = ({ state, percent }: { state: OnboardingSectionState, percent: number }) => {
  switch (state) {
    case 'COMPLETED':
      return (
        <div className="mt-4 flex items-center justify-center text-sm font-medium bg-white text-black px-4 py-2 rounded-lg w-full">
          ✅ Đã hoàn thành
        </div>
      );
    case 'IN_PROGRESS':
      return (
        <div className="mt-4 flex items-center justify-center text-sm font-medium bg-white text-black px-4 py-2 rounded-lg w-full font-semibold">
          Tiếp tục - {percent}% hoàn thành
        </div>
      );
    case 'NOT_STARTED':
    default:
      return (
        <div className="mt-4 flex items-center justify-center text-sm font-medium bg-white text-black px-4 py-2 rounded-lg w-full font-semibold">
          🚀 Bắt đầu
        </div>
      );
  }
};

/**
 * A reusable card component for displaying a single onboarding section.
 */
const ProgressCard = ({ 
  config, 
  state, 
  percent, 
  planId,
  isLocked // Prop mới để xác định trạng thái khóa
}: { 
  config: typeof sectionConfig.familySupport, 
  state: OnboardingSectionState, 
  percent: number, 
  planId: string,
  isLocked: boolean 
}) => {
  const { title, image, link, backgroundImage } = config;
  const router = useRouter();
  
  const handleClick = (link: string, planId: string) => {
    // Nếu bị khóa, không làm gì cả
    if (isLocked) {
      toast("Vui lòng hoàn thành mục trước đó!", {
        icon: '🔒',
      });
      return;
    };
    router.push(`/plan/${planId}/${link}`);
  }
  
  const cardClasses = cn(
    "block transition-transform duration-200 ease-in-out h-full group",
    !isLocked && "hover:scale-[1.02]", // Chỉ cho phép hover effect khi không bị khóa
    isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer" // Thêm style cho trạng thái khóa
  );

  return (
    <div onClick={() => handleClick(link, planId)} className={cardClasses}>
      <Card 
        className="border-slate-700/50 overflow-hidden h-full relative bg-cover bg-center"
        style={{ backgroundImage: backgroundImage }}
      >
        
        {/* Nội dung của thẻ */}
        <CardContent className="relative z-10 p-6 flex flex-col items-center text-center justify-between h-full">
          <div>
            <div className="backdrop-blur-sm rounded-full inline-block">
              <Image src={image} alt={title} width={50} height={50} />
            </div>
            <h3 className="text-xl font-bold text-white drop-shadow-lg mb-4">{title}</h3>
            <StatusButton state={state} percent={percent} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Main component to fetch and display the onboarding progress grid.
 */
export default function OnboardingProgressDisplay({ planId, progress }: OnboardingProgressDisplayProps) {
  if (!progress) {
    return <div className="text-slate-400 text-center py-4">Đang tải tiến độ onboarding...</div>;
  }

  // Logic để xác định trạng thái khóa của các section
  const isSpendingLocked = progress.familySupportState !== 'COMPLETED';
  const isAssumptionLocked = progress.spendingState !== 'COMPLETED';

  return (
    <div className="space-y-4">
       <div className="grid grid-rows-1 md:grid-rows-3 gap-4">
        <ProgressCard
          planId={planId}
          config={sectionConfig.familySupport}
          state={progress.familySupportState}
          percent={progress.familySupportPercent}
          isLocked={false} // Section đầu tiên không bao giờ bị khóa
        />
        <ProgressCard
          planId={planId}
          config={sectionConfig.spending}
          state={progress.spendingState}
          percent={progress.spendingPercent}
          isLocked={isSpendingLocked}
        />
        <ProgressCard
          planId={planId}
          config={sectionConfig.assumption}
          state={progress.assumptionState}
          percent={progress.assumptionPercent}
          isLocked={isAssumptionLocked}
        />
      </div>
    </div>
  );
}
