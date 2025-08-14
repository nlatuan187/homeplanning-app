"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plan, MilestoneProgress } from "@prisma/client";
import { getMilestonesByGroup, MilestoneGroup } from "@/lib/isMilestoneUnlocked";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronsUpDown, Lock, Check } from "lucide-react";
import MilestoneSteps from "./MilestoneSteps";
import AccumulationProgress from "./AccumulationProgress";
import MilestoneTaskSection from "./MilestioneTaskSection";
import MilestoneCompleted from "./MilestoneCompleted";
import AddCashflowModal from "./AddCashflowModal";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { updatePlanProgress } from "@/actions/updatePlanProgress";
import { updateCurrentSavings, updateMilestoneProgressOnCompletion } from "@/actions/milestoneProgress";

type PlanWithMilestoneProgress = Plan & {
  milestoneProgress?: MilestoneProgress | null;
};

// Interface mới phù hợp với cấu trúc milestoneGroups
interface MilestoneData {
  id: number;
  title: string;
  status: "done" | "current" | "upcoming";
  milestones: {
    groupId: number;
    status: "done" | "current" | "upcoming";
    amountValue: number;
  }[];
  currentSavings: number;
  lastDoneAmountValue: number;
  progress: number;
}

export default function PlanPageClient({ 
  initialPlan, 
  initialMilestoneId 
}: { 
  initialPlan: PlanWithMilestoneProgress;
  initialMilestoneId?: number;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [showMilestoneCompleted, setShowMilestoneCompleted] = useState(false);
  const [justCompletedMilestoneId, setJustCompletedMilestoneId] = useState<number | null>(null);

  // Kiểm tra URL parameter để xem có phải vừa hoàn thành milestone không
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const completed = urlParams.get('completed');
      if (completed === 'true' && initialMilestoneId) {
        setJustCompletedMilestoneId(initialMilestoneId);
        setShowMilestoneCompleted(true);
      }
    }
  }, [initialMilestoneId]);

  // Thêm useEffect để reset showMilestoneCompleted khi URL thay đổi và không có completed=true
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const completed = urlParams.get('completed');
      
      if (completed !== 'true') {
        // Nếu URL không có completed=true, reset showMilestoneCompleted
        setShowMilestoneCompleted(false);
        setJustCompletedMilestoneId(null);
      } else if (completed === 'true' && initialMilestoneId) {
        // Nếu có completed=true, hiển thị MilestoneCompleted
        setJustCompletedMilestoneId(initialMilestoneId);
        setShowMilestoneCompleted(true);
      }
    }
  }, [initialMilestoneId]);

  // State để lưu dữ liệu MilestoneProgress
  const [milestoneProgress, setMilestoneProgress] = useState<MilestoneProgress | null>(
    initialPlan.milestoneProgress || null 
  );

  // Thêm state để theo dõi milestone con hiện tại
  const [currentMilestoneStep, setCurrentMilestoneStep] = useState(1);

  // Parse milestoneGroups để lấy danh sách tất cả milestones
  const milestoneGroups = milestoneProgress?.milestoneGroups 
    ? (typeof milestoneProgress.milestoneGroups === 'string' 
        ? JSON.parse(milestoneProgress.milestoneGroups) 
        : milestoneProgress.milestoneGroups) as MilestoneGroup[]
    : [];
  console.log("milestoneGroups", milestoneGroups);

  // Tạo danh sách milestones chính từ milestoneGroups
  // Mỗi milestone sẽ có amountValue lớn nhất trong group đó
  const mainMilestones = useMemo(() => {
    return milestoneGroups.map(group => {
      // Tìm amountValue lớn nhất trong group
      const maxAmountValue = Math.max(...group.milestones.map(m => m.amountValue));
      
      return {
        id: group.id,
        title: group.title,
        status: group.status,
        milestones: group.milestones, // Giữ nguyên toàn bộ milestones trong group
        currentSavings: milestoneProgress?.currentSavings || 0,
        lastDoneAmountValue: 0, // Sẽ được tính toán sau
        progress: 0, // Sẽ được tính toán sau
      };
    }).sort((a, b) => a.id - b.id); // Sắp xếp theo ID
  }, [milestoneGroups]); // Xóa dependency vào milestoneProgress?.currentSavings

  // Tìm milestone hiện tại dựa trên initialMilestoneId hoặc milestone có status "current"
  const currentMilestone = useMemo(() => {
    if (initialMilestoneId) {
      return mainMilestones.find(m => m.id === initialMilestoneId);
    }
    return mainMilestones.find(m => m.status === "current") || mainMilestones[0];
  }, [initialMilestoneId, mainMilestones]);

  // Tìm index của milestone hiện tại
  const currentMilestoneIndex = useMemo(() => {
    return mainMilestones.findIndex(m => m.id === currentMilestone?.id);
  }, [mainMilestones, currentMilestone]);

  // Tìm milestone trước đó để lấy lastDoneAmountValue
  const previousMilestone = useMemo(() => {
    if (currentMilestoneIndex > 0) {
      return mainMilestones[currentMilestoneIndex - 1];
    }
    return null;
  }, [currentMilestoneIndex, mainMilestones]);

  // Tạo currentMilestoneData với thông tin đầy đủ
  const currentMilestoneData = useMemo(() => {
    if (!currentMilestone) return null;

    // Điểm bắt đầu của group hiện tại
    let lastDoneAmountValue: number;
    
    if (currentMilestoneIndex === 0) {
      // Group đầu tiên: dùng initialSavings
      lastDoneAmountValue = initialPlan.initialSavings || 0;
    } else {
      // Group khác: dùng amountValue lớn nhất của group trước đó
      const prevGroup = mainMilestones[currentMilestoneIndex - 1];
      lastDoneAmountValue = Math.max(...prevGroup.milestones.map(m => m.amountValue));
    }

    // Tính progress dựa trên currentSavings
    const progress = milestoneProgress?.currentSavings || 0;
    const min = lastDoneAmountValue;
    // Lấy amountValue lớn nhất trong milestones của group hiện tại
    const max = Math.max(...currentMilestone.milestones.map(m => m.amountValue));
    const progressPercent = max > min ? Math.round(((progress - min) / (max - min)) * 100) : 0;

    return {
      ...currentMilestone,
      lastDoneAmountValue,
      progress: Math.max(0, Math.min(100, progressPercent)),
    };
  }, [currentMilestone, currentMilestoneIndex, previousMilestone, initialPlan.initialSavings, milestoneProgress?.currentSavings]);

  // Cập nhật totalSteps và currentStep để phản ánh milestone con hiện tại
  const totalSteps = currentMilestoneData?.milestones.length || 0;

  // Sửa: currentStep chỉ phụ thuộc vào state local, không phụ thuộc vào currentSavings
  const currentStep = useMemo(() => {
    // Luôn sử dụng state local để tránh bị reset
    return currentMilestoneStep;
  }, [currentMilestoneStep]);

  // Tìm milestone con hiện tại dựa trên currentStep
  const currentMilestoneInGroup = useMemo(() => {
    if (!currentMilestoneData?.milestones) return null;
    
    // Hiển thị milestone con dựa trên currentStep
    const currentIndex = currentStep - 1; // currentStep bắt đầu từ 1
    const milestone = currentMilestoneData.milestones[currentIndex];
    
    if (!milestone) return null;
    
    // Sửa: Không phụ thuộc vào currentSavings để set status
    // Status sẽ được quản lý hoàn toàn bởi TodoList component
    return { ...milestone, status: "upcoming" as const };
  }, [currentMilestoneData?.milestones, currentStep, currentMilestoneData?.id]);

  // Sửa: Không phụ thuộc vào currentSavings để xác định milestone hoàn thành
  // Milestone chỉ hoàn thành khi tất cả tasks được hoàn thành
  const isCurrentMilestoneDone = false; // Luôn false để hiển thị TodoList

  // Nếu có initialMilestoneId, tìm và set milestone tương ứng
  useEffect(() => {
    if (initialMilestoneId && mainMilestones.length > 0) {
      const targetMilestone = mainMilestones.find(m => m.id === initialMilestoneId);
      if (targetMilestone) {
        updateCurrentMilestone(targetMilestone);
      }
    }
  }, [initialMilestoneId, mainMilestones]);

  // Update handlePreviousMilestone và handleNextMilestone
  const handlePreviousMilestone = () => {
    if (currentStep > 1) {
      // Nếu không phải milestone đầu tiên trong group, chuyển đến milestone trước đó
      const previousStep = currentStep - 1;
      setCurrentMilestoneStep(previousStep);
      console.log(`✅ Chuyển từ milestone con ${currentStep} sang ${previousStep} trong cùng group`);
    } else if (currentMilestoneIndex > 0) {
      // Nếu là milestone đầu tiên của group hiện tại, chuyển đến milestone cuối cùng của group trước đó
      const previousGroup = mainMilestones[currentMilestoneIndex - 1];
      const previousGroupMilestones = previousGroup.milestones;
      const lastMilestoneInPreviousGroup = previousGroupMilestones.length;
      
      // Chuyển đến milestone cuối cùng của group trước đó
      setCurrentMilestoneStep(lastMilestoneInPreviousGroup);
      
      // Cập nhật URL với milestoneId mới
      router.push(`/plan/${initialPlan.id}/plan?milestoneId=${previousGroup.id}`);
      
      console.log(`✅ Chuyển từ milestone đầu tiên của group ${currentMilestoneIndex} sang milestone cuối cùng của group ${currentMilestoneIndex - 1}`);
    }
  };

  // Thêm state để track xem có phải đang chuyển từ MilestoneCompleted không
  const [isTransitioningFromCompleted, setIsTransitioningFromCompleted] = useState(false);

  // Modify the handleNextMilestone function
  const handleNextMilestone = () => {
    if (currentStep < totalSteps) {
      // Nếu không phải milestone cuối cùng trong group, chuyển đến milestone tiếp theo
      const nextStep = currentStep + 1;
      setCurrentMilestoneStep(nextStep);
      console.log(`✅ Chuyển từ milestone con ${currentStep} sang ${nextStep} trong cùng group`);
    } else if (currentMilestoneIndex < mainMilestones.length - 1) {
      // Nếu là milestone cuối cùng của group hiện tại, chuyển đến milestone đầu tiên của group kế tiếp
      const nextGroup = mainMilestones[currentMilestoneIndex + 1];
      
      // Reset milestone step về 1 khi chuyển group
      setCurrentMilestoneStep(1);
      
      // Cập nhật URL với milestoneId mới
      router.push(`/plan/${initialPlan.id}/plan?milestoneId=${nextGroup.id}`);
      
      console.log(`✅ Chuyển từ milestone cuối cùng của group ${currentMilestoneIndex} sang milestone đầu tiên của group ${currentMilestoneIndex + 1}`);
    }
  };

  const updateCurrentMilestone = (milestone: any) => {
    console.log("🔄 updateCurrentMilestone called with:", milestone);
    
    // Tìm milestone trước đó để lấy lastDoneAmountValue
    const currentIndex = mainMilestones.findIndex(m => m.id === milestone.id);
    const previousMilestone = currentIndex > 0 ? mainMilestones[currentIndex - 1] : null;
    
    // Nếu là milestone đầu tiên, dùng initialSavings, nếu không thì dùng amountValue lớn nhất của milestone trước
    const lastDoneAmountValue = currentIndex === 0 
      ? (initialPlan.initialSavings || 0) 
      : Math.max(...(previousMilestone?.milestones.map(m => m.amountValue) || [0]));
    
    const newMilestoneData = {
      id: milestone.id,
      title: milestone.title,
      status: milestone.status,
      milestones: milestone.milestones,
      currentSavings: milestoneProgress?.currentSavings || 0,
      lastDoneAmountValue: lastDoneAmountValue,
      progress: 0, // Sẽ được tính toán lại
    };

    console.log("🔄 New milestone data:", newMilestoneData);

    // Cập nhật local state
    setMilestoneProgress(prev => prev ? {
      ...prev,
      currentMilestoneData: newMilestoneData,
    } : null);
    
    // Reset milestone con về bước đầu tiên
    setCurrentMilestoneStep(1);
    
    console.log("🔄 Current milestone updated to:", milestone.id);
  };

  // Sửa logic xử lý milestone completion
  const handleMilestoneCompleted = async (milestoneId: number) => {
    console.log("🎯 handleMilestoneCompleted called with milestoneId:", milestoneId);
    
    try {
      // Cập nhật milestone progress trong database
      const updatedProgress = await updateMilestoneProgressOnCompletion(initialPlan.id, milestoneId);
      
      // Cập nhật local state với dữ liệu từ database
      setMilestoneProgress(updatedProgress);
      
      // Cập nhật status của milestones và groups ngay lập tức
      updateMilestoneStatusOnCompletion(milestoneId);
      
      // Kiểm tra xem có phải milestone cuối cùng của group hiện tại không
      const currentGroup = milestoneGroups.find(group => group.id === currentMilestone?.id);
      const isLastMilestoneInGroup = currentGroup && currentStep >= currentGroup.milestones.length;
      
      if (isLastMilestoneInGroup) {
        // Nếu là milestone cuối cùng của group, hiển thị MilestoneCompleted
        setJustCompletedMilestoneId(milestoneId);
        setShowMilestoneCompleted(true);
        
        // Cập nhật URL để reflect milestone completion
        router.push(`/plan/${initialPlan.id}/plan?milestoneId=${milestoneId}&completed=true`);
      } else {
        // Nếu không phải milestone cuối cùng của group, chuyển đến milestone tiếp theo
        const nextStep = currentStep + 1;
        setCurrentMilestoneStep(nextStep);
      }
    } catch (error) {
      console.error("Error handling milestone completion:", error);
    }
  };  

  // Sửa logic cập nhật status khi milestone hoàn thành
  const updateMilestoneStatusOnCompletion = (completedMilestoneId: number) => {
    const currentSavings = milestoneProgress?.currentSavings || 0;
    
    // Cập nhật status cho tất cả milestones dựa trên currentSavings VÀ completion của tasks
    const updatedMilestoneGroups = milestoneGroups.map(group => {
      const updatedMilestones = group.milestones.map(milestone => {
        const milestoneAmount = milestone.amountValue || 0;
        
        // Milestone hoàn thành khi currentSavings >= amountValue
        if (currentSavings >= milestoneAmount) {
          return { ...milestone, status: "done" as const };
        } else {
          return { ...milestone, status: "upcoming" as const };
        }
      });
      
      // Cập nhật status tổng thể của group
      let groupStatus: "done" | "current" | "upcoming" = "upcoming";
      const allDone = updatedMilestones.every(milestone => milestone.status === "done");
      
      if (allDone) {
        groupStatus = "done";
      } else {
        // Nếu không có milestone nào là "current", tìm milestone đầu tiên chưa hoàn thành
        const hasCurrent = updatedMilestones.some(milestone => milestone.status === "current" as any);
        if (!hasCurrent) {
          const firstUpcomingIndex = updatedMilestones.findIndex(milestone => milestone.status === "upcoming");
          if (firstUpcomingIndex !== -1) {
            updatedMilestones[firstUpcomingIndex] = { 
              ...updatedMilestones[firstUpcomingIndex], 
              status: "current" as any 
            };
          }
        }
        groupStatus = "current";
      }

      return {
        ...group,
        milestones: updatedMilestones,
        status: groupStatus,
      };
    });

    // Cập nhật local state
    setMilestoneProgress(prev => prev ? {
      ...prev,
      milestoneGroups: updatedMilestoneGroups,
    } : null);
  };

  // Thêm hàm mới để update status milestones và groups dựa theo currentSavings
  const updateMilestoneStatusesBasedOnCurrentSavings = () => {
    const currentSavings = milestoneProgress?.currentSavings || 0;
    
    // Update status cho tất cả milestones dựa trên currentSavings
    const updatedMilestoneGroups = milestoneGroups.map(group => {
      const updatedMilestones = group.milestones.map(milestone => {
        const milestoneAmount = milestone.amountValue || 0;
        
        // Milestone hoàn thành khi currentSavings >= amountValue
        if (currentSavings >= milestoneAmount) {
          return { ...milestone, status: "done" as const };
        } else {
          return { ...milestone, status: "upcoming" as const };
        }
      });
      
      // Cập nhật status tổng thể của group
      let groupStatus: "done" | "current" | "upcoming" = "upcoming";
      const allDone = updatedMilestones.every(milestone => milestone.status === "done");
      
      if (allDone) {
        groupStatus = "done";
      } else {
        // Nếu không có milestone nào là "current", tìm milestone đầu tiên chưa hoàn thành
        const hasCurrent = updatedMilestones.some(milestone => milestone.status === "current" as any);
        if (!hasCurrent) {
          const firstUpcomingIndex = updatedMilestones.findIndex(milestone => milestone.status === "upcoming");
          if (firstUpcomingIndex !== -1) {
            updatedMilestones[firstUpcomingIndex] = { 
              ...updatedMilestones[firstUpcomingIndex], 
              status: "current" as any 
            };
          }
        }
        groupStatus = "current";
      }

      return {
        ...group,
        milestones: updatedMilestones,
        status: groupStatus,
      };
    });

    // Cập nhật local state với milestoneGroups mới
    setMilestoneProgress(prev => prev ? {
      ...prev,
      milestoneGroups: updatedMilestoneGroups,
    } : null);
    
    console.log("✅ Updated milestone statuses based on currentSavings:", currentSavings);
  };

  // Khôi phục milestone step từ localStorage khi component mount
  useEffect(() => {
    const savedStep = localStorage.getItem(`milestoneStep_${initialPlan.id}`);
    if (savedStep) {
      const step = parseInt(savedStep);
      if (step > 0 && step <= totalSteps) {
        setCurrentMilestoneStep(step);
        console.log(`🔄 Khôi phục milestone step từ localStorage: ${step}`);
      }
    }
  }, [initialPlan.id, totalSteps]);

  // Debug log khi currentStep thay đổi
  useEffect(() => {
    console.log(`🔄 currentStep changed to: ${currentStep}`);
    console.log(`🔄 currentMilestoneStep: ${currentMilestoneStep}`);
  }, [currentStep, currentMilestoneStep]);

  if (showMilestoneCompleted) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <header className="container mx-auto max-w-5xl px-4 flex items-center justify-between sticky top-0 bg-slate-950 z-40 border-b border-slate-800">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => router.push(`/plan/${initialPlan.id}/roadmap`)}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </header>
        <div className="container mx-auto max-w-5xl px-4">
          <MilestoneCompleted
            milestoneId={justCompletedMilestoneId || undefined}
            onNext={() => {
              // Tắt showMilestoneCompleted trước
              setShowMilestoneCompleted(false);
              setJustCompletedMilestoneId(null);
              
              // Tìm group hiện tại và group kế tiếp
              const currentGroupIndex = milestoneGroups.findIndex(group => group.id === justCompletedMilestoneId);
              const nextGroupIndex = currentGroupIndex + 1;
              
              if (nextGroupIndex < milestoneGroups.length) {
                // Chuyển đến milestone đầu tiên của group kế tiếp
                const nextGroup = milestoneGroups[nextGroupIndex];
                
                // Cập nhật status của group hiện tại thành "done" và group kế tiếp thành "current"
                const updatedMilestoneGroups = milestoneGroups.map((group, index) => {
                  if (index === currentGroupIndex) {
                    return { ...group, status: "done" as const };
                  } else if (index === nextGroupIndex) {
                    return { ...group, status: "current" as const };
                  }
                  return group;
                });
                
                // Cập nhật local state
                setMilestoneProgress(prev => prev ? {
                  ...prev,
                  milestoneGroups: JSON.parse(JSON.stringify(updatedMilestoneGroups)),
                } : null);
                
                // Chuyển đến milestone đầu tiên của group kế tiếp
                router.push(`/plan/${initialPlan.id}/plan?milestoneId=${nextGroup.id}`);
              } else {
                // Nếu không còn group nào, chuyển về roadmap
                router.push(`/plan/${initialPlan.id}/roadmap`);
              }
            }}
            planId={initialPlan.id}
            totalMilestones={mainMilestones.length}
            isLastMilestone={justCompletedMilestoneId === mainMilestones.length}
            amountValue={Math.max(...(currentMilestoneData?.milestones.map(m => m.amountValue) || [0]))}
          />
        </div>
      </main>
    )
  }
  
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header với nút swipe */}
      <header className="container mx-auto max-w-5xl px-4 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-slate-950 z-40 border-b border-slate-800">
        <Button variant="ghost" size="icon" className="text-white" onClick={() => router.push(`/plan/${initialPlan.id}/roadmap`)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white"
            onClick={handlePreviousMilestone}
            disabled={currentMilestoneIndex === 0}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold">
              {currentMilestoneData ? currentMilestoneData.title : "Cột mốc số 1"}
            </div>
            <div className="text-[14px] text-gray-400">
              {currentMilestoneData ? (
                (() => {
                  // Lấy amountValue lớn nhất trong milestones của group hiện tại
                  const maxAmountValue = Math.max(...currentMilestoneData.milestones.map(m => m.amountValue));
                  
                  if (maxAmountValue != null) {
                    if (maxAmountValue >= 1000000000) {
                      return `Tích lũy đạt ${(maxAmountValue / 1000000000).toFixed(1)} tỷ`;
                    } else if (maxAmountValue >= 1000000) {
                      return `Tích lũy đạt ${maxAmountValue / 1000000} triệu`;
                    } else {
                      return `Tích lũy đạt ${Math.round(maxAmountValue).toLocaleString()}`;
                    }
                  } else {
                    return "Tích lũy đạt mục tiêu";
                  }
                })()
              ) : (
                "Tích lũy đạt mục tiêu"
              )}
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white"
            onClick={handleNextMilestone}
            disabled={currentMilestoneIndex === mainMilestones.length - 1}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
        
        <Button variant="ghost" size="icon" className="text-white">
          <ChevronsUpDown className="h-6 w-6" />
        </Button>
      </header>

      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-8">
          <MilestoneSteps 
            totalSteps={totalSteps} 
            currentStep={currentStep}
            milestones={currentMilestoneData?.milestones || []}
          />
        </div>

        {/* Accumulation Progress */}
        <div className="mb-4">
          <AccumulationProgress 
            current={milestoneProgress?.currentSavings ?? 0}
            min={currentMilestoneData?.lastDoneAmountValue ?? 0}
            max={Math.max(...(currentMilestoneData?.milestones.map(m => m.amountValue) || [0]))}
          />
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        <div className="mb-8">
          <MilestoneTaskSection 
            milestoneId={currentMilestoneInGroup?.groupId || 1} 
            planId={initialPlan.id}
            plan={initialPlan}
            accumulationMax={currentMilestoneInGroup?.amountValue || 0}
            accumulationMin={currentMilestoneData?.lastDoneAmountValue ?? 0}
            milestones={currentMilestoneData?.milestones || []}
            currentMilestoneInGroup={currentMilestoneInGroup}
            onSavingsUpdate={async (amount) => {
              console.log("🔄 onSavingsUpdate called with amount:", amount);
              console.log("🔄 Current milestoneId:", currentMilestoneInGroup?.groupId);
              console.log("🔄 Current currentSavings:", milestoneProgress?.currentSavings);
              
              try {
                // Cập nhật database trước
                console.log("📤 Calling updateCurrentSavings...");
                const updatedProgress = await updateCurrentSavings(initialPlan.id, amount);
                console.log("✅ Database updated, new currentSavings:", updatedProgress.currentSavings);
                
                // Cập nhật currentSavings trong local state
                setMilestoneProgress(prev => {
                  if (!prev) return updatedProgress;
                  
                  return {
                    ...prev,
                    currentSavings: updatedProgress.currentSavings,
                    savingsPercentage: updatedProgress.savingsPercentage,
                    lastProgressUpdate: updatedProgress.lastProgressUpdate,
                  };
                });
                
                console.log("✅ Local state updated with new currentSavings:", updatedProgress.currentSavings);
                
              } catch (error) {
                console.error("❌ Error updating current savings:", error);
                // Fallback: cập nhật local state nếu database fail
                setMilestoneProgress(prev => {
                  if (!prev) return null;
                  
                  const newCurrentSavings = prev.currentSavings + amount;
                  console.log(" Fallback: updating local state", prev.currentSavings, "->", newCurrentSavings);
                  
                  return {
                    ...prev,
                    currentSavings: newCurrentSavings,
                    savingsPercentage: prev.housePriceProjected > 0 
                      ? Math.round((newCurrentSavings / prev.housePriceProjected) * 100)
                      : 0,
                  };
                });
              }
            }}
            onMilestoneCompleted={() => handleMilestoneCompleted(currentMilestoneInGroup?.groupId || 1)}
            isMilestoneCompleted={isCurrentMilestoneDone}
            onGoToRoadmap={() => router.push(`/plan/${initialPlan.id}/roadmap`)}
            isLastMilestone={currentMilestoneIndex === mainMilestones.length - 1}
            // Sửa: hasNextMilestone bao gồm cả milestone con kế tiếp và group kế tiếp
            hasNextMilestone={
              currentStep < totalSteps || // Còn milestone con kế tiếp trong group hiện tại
              currentMilestoneIndex < mainMilestones.length - 1 // Còn group kế tiếp
            }
            onNextMilestone={() => {
              console.log("🔄 onNextMilestone called");
              
              if (currentStep < totalSteps) {
                // Chuyển đến milestone con kế tiếp trong cùng group
                const nextStep = currentStep + 1;
                setCurrentMilestoneStep(nextStep);
                
                // Xóa localStorage
                // localStorage.setItem(`milestoneStep_${initialPlan.id}`, nextStep.toString());
                
                console.log(`✅ Chuyển từ milestone con ${currentStep} sang ${nextStep}`);
              } else if (currentMilestoneIndex < mainMilestones.length - 1) {
                // Chuyển đến group kế tiếp
                // Không cần setCurrentMilestoneIndex nữa vì nó được tính toán tự động
                // setCurrentMilestoneIndex(nextGroupIndex);
                
                // Reset milestone step về 1 khi chuyển group
                setCurrentMilestoneStep(1);
                // Xóa localStorage
                // localStorage.setItem(`milestoneStep_${initialPlan.id}`, "1");
                
                console.log(`✅ Chuyển từ group ${currentMilestoneIndex} sang ${currentMilestoneIndex + 1}`);
              }
            }}
          />
        </div>
      </div>

      <AddCashflowModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (description: string, amount: number) => {
          console.log("💰 Add cashflow:", description, "Amount:", amount);
          
          try {
            // Cập nhật currentSavings trong database
            const updatedProgress = await updateCurrentSavings(initialPlan.id, amount);
            console.log("✅ Database updated with cashflow, new currentSavings:", updatedProgress.currentSavings);
            
            // Cập nhật currentSavings trong local state
            setMilestoneProgress(prev => {
              if (!prev) return updatedProgress;
              
              return {
                ...prev,
                currentSavings: updatedProgress.currentSavings,
                savingsPercentage: updatedProgress.savingsPercentage,
                lastProgressUpdate: updatedProgress.lastProgressUpdate,
              };
            });
            
            // Cập nhật status milestones và groups dựa theo currentSavings mới
            updateMilestoneStatusesBasedOnCurrentSavings();
            
            console.log("✅ Local state updated with new currentSavings:", updatedProgress.currentSavings);
            
            // Đóng modal sau khi hoàn thành
            setModalOpen(false);
            
          } catch (error) {
            console.error("❌ Error updating current savings with cashflow:", error);
            // Fallback: cập nhật local state nếu database fail
            setMilestoneProgress(prev => {
              if (!prev) return null;
              
              const newCurrentSavings = prev.currentSavings + amount;
              console.log(" Fallback: updating local state", prev.currentSavings, "->", newCurrentSavings);
              
              return {
                ...prev,
                currentSavings: newCurrentSavings,
                savingsPercentage: prev.housePriceProjected > 0 
                  ? Math.round((newCurrentSavings / prev.housePriceProjected) * 100)
                  : 0,
              };
            });
            
            // Đóng modal sau khi fallback
            setModalOpen(false);
          }
        }}
      />
    </main>
  );
}
