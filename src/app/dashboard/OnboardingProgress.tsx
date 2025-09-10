"use client"; // Mark as a client component as it's used within one

import Link from 'next/link';
import { OnboardingProgress, OnboardingSectionState } from '@prisma/client';
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Rocket } from 'lucide-react';
import Image from "next/image";

interface OnboardingProgressDisplayProps {
  planId: string;
  progress: OnboardingProgress | null;
}

// Configuration for each onboarding section card
const sectionConfig = {
  familySupport: {
    title: "Nguồn lực hỗ trợ",
    image: "/icons/suitcase 2.png",
    link: (planId: string) => `/plan/${planId}/familysupport`,
    backgroundImage: "url('/onboarding/card2bg.png')", 
  },
  spending: {
    title: "Dòng tiền đi ra",
    image: "/icons/suitcase 3.png",
    link: (planId: string) => `/plan/${planId}/spending`,
    backgroundImage: "url('/onboarding/card3bg.png')", 
  },
  assumption: {
    title: "Giả định & Chiến lược",
    image: "/icons/suitcase 4.png",
    link: (planId: string) => `/plan/${planId}/assumption`,
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
        <div className="mt-4 flex items-center justify-center text-sm font-medium bg-green-500/20 text-green-300 px-4 py-2 rounded-lg w-full">
          <CheckCircle className="h-4 w-4 mr-2" />
          Đã hoàn thành
        </div>
      );
    case 'IN_PROGRESS':
      return (
        <div className="mt-4 flex items-center justify-center text-sm font-medium bg-slate-200 text-slate-800 px-4 py-2 rounded-lg w-full font-semibold">
          Tiếp tục - {percent}% hoàn thành
        </div>
      );
    case 'NOT_STARTED':
    default:
      return (
        <div className="mt-4 flex items-center justify-center text-sm font-medium bg-slate-200 text-slate-800 px-4 py-2 rounded-lg w-full font-semibold">
          <Rocket className="h-4 w-4 mr-2" />
          Bắt đầu
        </div>
      );
  }
};

/**
 * A reusable card component for displaying a single onboarding section.
 */
const ProgressCard = ({ config, state, percent, planId }: { config: typeof sectionConfig.familySupport, state: OnboardingSectionState, percent: number, planId: string }) => {
  const { title, image, link, backgroundImage } = config;
  
  return (
    <Link href={link(planId)} className="block hover:scale-[1.02] transition-transform duration-200 ease-in-out h-full group">
      <Card 
        className="border-slate-700/50 overflow-hidden h-full relative bg-cover bg-center"
        style={{ backgroundImage: backgroundImage }}
      >
        
        {/* Nội dung của thẻ */}
        <CardContent className="relative z-10 p-6 flex flex-col items-center text-center justify-between h-full">
          <div>
            <div className="p-4 bg-black/30 backdrop-blur-sm rounded-full inline-block mb-4">
              <Image src={image} alt={title} width={32} height={32} />
            </div>
            <h3 className="text-xl font-bold text-white drop-shadow-lg">{title}</h3>
          </div>
          <StatusButton state={state} percent={percent} />
        </CardContent>
      </Card>
    </Link>
  );
};

/**
 * Main component to fetch and display the onboarding progress grid.
 */
export default function OnboardingProgressDisplay({ planId, progress }: OnboardingProgressDisplayProps) {
  if (!progress) {
    return <div className="text-slate-400 text-center py-4">Đang tải tiến độ onboarding...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-100">Bắt đầu kế hoạch</h2>
       <div className="grid grid-rows-1 md:grid-rows-3 gap-4">
        <ProgressCard
          planId={planId}
          config={sectionConfig.familySupport}
          state={progress.familySupportState}
          percent={progress.familySupportPercent}
        />
        <ProgressCard
          planId={planId}
          config={sectionConfig.spending}
          state={progress.spendingState}
          percent={progress.spendingPercent}
        />
        <ProgressCard
          planId={planId}
          config={sectionConfig.assumption}
          state={progress.assumptionState}
          percent={progress.assumptionPercent}
        />
      </div>
    </div>
  );
}
