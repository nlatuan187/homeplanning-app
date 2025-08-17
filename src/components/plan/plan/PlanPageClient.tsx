"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plan, MilestoneProgress } from "@prisma/client";
import { MilestoneGroup as OriginalMilestoneGroup } from "@/lib/isMilestoneUnlocked";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronsUpDown, Lock, Check } from "lucide-react";
import MilestoneSteps from "./MilestoneSteps";
import AccumulationProgress from "./AccumulationProgress";
import MilestoneTaskSection from "./MilestioneTaskSection";
import MilestoneCompleted from "./MilestoneCompleted";
import AddCashflowModal from "./AddCashflowModal";
import { generateProjections } from "@/lib/calculations/projections/generateProjections";
import { updatePlanProgress } from "@/actions/updatePlanProgress";
// SỬA LỖI: Sử dụng đúng server action và import
import { updateCurrentSavings, updateMilestoneProgress } from "@/actions/milestoneProgress";


// =================================================================
// SỬA LỖI 1: HOÀN THIỆN TYPE DEFINITION
// Bổ sung các kiểu dữ liệu chi tiết hơn để code hiểu rõ cấu trúc
// =================================================================
interface SubMilestoneItem {
  text: string;
  type: string;
  status: "incomplete" | "completed" | "auto-completed";
  amount?: number;
}

interface SubMilestone {
  groupId: number;
  status: "done" | "current" | "upcoming";
  amountValue: number;
  items: SubMilestoneItem[]; // <-- Bổ sung thuộc tính 'items' bị thiếu
}

// Kế thừa và mở rộng type gốc
interface MilestoneGroup extends OriginalMilestoneGroup {
  milestones: SubMilestone[];
}


type PlanWithMilestoneProgress = Plan & {
  milestoneProgress?: MilestoneProgress | null;
};

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

  const [milestoneProgress, setMilestoneProgress] = useState<MilestoneProgress | null>(
    initialPlan.milestoneProgress || null 
  );
  
  // =================================================================
  // SỬA LỖI 2: SẮP XẾP LẠI THỨ TỰ KHAI BÁO
  // Khai báo state `currentMilestoneStep` ở đây để các `useMemo` sau có thể sử dụng
  // =================================================================
  const [currentMilestoneStep, setCurrentMilestoneStep] = useState(1);

  // SỬA: THÊM STATE MỚI ĐỂ LÀM "TÍN HIỆU"
  // const [justCompletedIdentifier, setJustCompletedIdentifier] = useState<string | null>(null);

  const milestoneGroups: MilestoneGroup[] = useMemo(() => {
    return milestoneProgress?.milestoneGroups
      ? (typeof milestoneProgress?.milestoneGroups === 'string'
        ? JSON.parse(milestoneProgress.milestoneGroups)
        : milestoneProgress.milestoneGroups)
      : [];
  }, [milestoneProgress?.milestoneGroups]);
  // Các `useMemo` giờ sẽ được tính toán theo đúng thứ tự phụ thuộc
  const mainMilestones = useMemo(() => {
    return milestoneGroups.map(group => ({
      id: group.id,
      title: group.title,
      status: group.status,
      milestones: group.milestones,
    })).sort((a, b) => a.id - b.id);
  }, [milestoneGroups]);

  

  const currentMilestone = useMemo(() => {
    if (initialMilestoneId) {
      return mainMilestones.find(m => m.id === initialMilestoneId);
    }
    return mainMilestones.find(m => m.status === "current") || mainMilestones[0];
  }, [initialMilestoneId, mainMilestones]);

  const currentMilestoneIndex = useMemo(() => {
    return mainMilestones.findIndex(m => m.id === currentMilestone?.id);
  }, [mainMilestones, currentMilestone]);
  
  const totalSteps = currentMilestone?.milestones.length || 0;

  // `currentStep` là một biến cục bộ để đảm bảo giá trị nằm trong khoảng hợp lệ
  const currentStep = useMemo(() => {
    return Math.max(1, Math.min(currentMilestoneStep, totalSteps));
  }, [currentMilestoneStep, totalSteps]);

  const currentMilestoneData = useMemo(() => {
    if (!currentMilestone) return null;
    const lastDoneAmountValue = currentMilestoneIndex === 0 
      ? (initialPlan.initialSavings || 0)
      : Math.max(...(mainMilestones[currentMilestoneIndex - 1]?.milestones.map(m => m.amountValue) || [0]));

    const progress = milestoneProgress?.currentSavings || 0;
    const min = lastDoneAmountValue;
    const max = Math.max(...currentMilestone.milestones.map(m => m.amountValue));
    const progressPercent = max > min ? Math.round(((progress - min) / (max - min)) * 100) : 0;

    return {
      ...currentMilestone,
      lastDoneAmountValue,
      progress: Math.max(0, Math.min(100, progressPercent)),
    };
  }, [currentMilestone, currentMilestoneIndex, mainMilestones, initialPlan.initialSavings, milestoneProgress?.currentSavings]);

  const currentMilestoneInGroup = useMemo(() => {
    if (!currentMilestoneData?.milestones) return null;
    return currentMilestoneData.milestones[currentStep - 1] || null;
  }, [currentMilestoneData, currentStep]);


  const isCurrentMilestoneDone = false; // Placeholder

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const completed = urlParams.get('completed');
      
      if (completed !== 'true') {
        setShowMilestoneCompleted(false);
        setJustCompletedMilestoneId(null);
      } else if (completed === 'true' && initialMilestoneId) {
        setJustCompletedMilestoneId(initialMilestoneId);
        setShowMilestoneCompleted(true);
      }
    }
  }, [initialMilestoneId]);

  const handlePreviousMilestone = () => {
    if (currentStep > 1) {
      setCurrentMilestoneStep(currentStep - 1);
    } else if (currentMilestoneIndex > 0) {
      const previousGroup = mainMilestones[currentMilestoneIndex - 1];
      router.push(`/plan/${initialPlan.id}/plan?milestoneId=${previousGroup.id}`);
      setCurrentMilestoneStep(previousGroup.milestones.length);
    }
  };

  // Thêm state để track xem có phải đang chuyển từ MilestoneCompleted không
  const [isTransitioningFromCompleted, setIsTransitioningFromCompleted] = useState(false);

  const handleNextMilestone = () => {
    if (currentStep < totalSteps) {
      setCurrentMilestoneStep(currentStep + 1);
    } else if (currentMilestoneIndex < mainMilestones.length - 1) {
      const nextGroup = mainMilestones[currentMilestoneIndex + 1];
      router.push(`/plan/${initialPlan.id}/plan?milestoneId=${nextGroup.id}`);
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

  // =================================================================
  // BƯỚC 2: ĐỊNH NGHĨA "HÀNH ĐỘNG" - HÀM `handleMilestoneCompleted`
  // =================================================================

  // Helper function để tìm milestone con tiếp theo
  const getNextMilestone = (groups: MilestoneGroup[], currentGroupId: number, currentSubIndex: number) => {
    const currentGroup = groups.find(g => g.id === currentGroupId);
    if (!currentGroup) return null;

    if (currentSubIndex < currentGroup.milestones.length - 1) {
      const nextSubIndex = currentSubIndex + 1;
      return {
          groupId: currentGroupId,
          subIndex: nextSubIndex,
          identifier: `${currentGroupId}-${nextSubIndex}`
      };
    }

    const currentGroupIndexInAll = groups.findIndex(g => g.id === currentGroupId);
    if (currentGroupIndexInAll < groups.length - 1 && currentGroupIndexInAll !== -1) {
      const nextGroup = groups[currentGroupIndexInAll + 1];
      if (nextGroup?.milestones.length > 0) {
        return {
            groupId: nextGroup.id,
            subIndex: 0,
            identifier: `${nextGroup.id}-0`
        };
      }
    }
    return null;
  };

  const handleMilestoneCompleted = async () => {
    const groupOfCurrentMilestone = currentMilestone;
    const subMilestoneIndexOfCurrent = currentStep - 1;
    const subMilestoneCurrent = currentMilestoneInGroup;
    const allMilestoneGroups = milestoneGroups;
    const currentSavingsValue = milestoneProgress?.currentSavings || 0;

    if (!groupOfCurrentMilestone || subMilestoneIndexOfCurrent < 0 || !subMilestoneCurrent) return;

    const milestoneIdentifier = `${groupOfCurrentMilestone.id}-${subMilestoneIndexOfCurrent}`;
    
    const nextMilestone = getNextMilestone(allMilestoneGroups, groupOfCurrentMilestone.id, subMilestoneIndexOfCurrent);
    
    let newGroups = allMilestoneGroups.map(group => {
      let newGroup = { ...group };

      if (group.id === groupOfCurrentMilestone.id) {
        newGroup.milestones = group.milestones.map((ms: any, index: number) => {
          if (index === subMilestoneIndexOfCurrent) {
            const newItems = ms.items.map((item: any) => ({ ...item, status: 'auto-completed' as const }));
            return { ...ms, status: 'done' as const, items: newItems };
          }
          return ms;
        });
      }
      if (nextMilestone && group.id === nextMilestone.groupId) {
        newGroup.milestones = newGroup.milestones.map((ms: any, index: number) => {
          if (index === nextMilestone.subIndex) {
            return { ...ms, status: 'current' as const };
          }
          return ms;
        });
      }

      const isLastSubMilestoneInGroup = subMilestoneIndexOfCurrent === groupOfCurrentMilestone.milestones.length - 1;

      if (isLastSubMilestoneInGroup) {
        if (group.id === groupOfCurrentMilestone.id) {
          newGroup.status = 'done';
        }
        if (nextMilestone && group.id === nextMilestone.groupId) {
          newGroup.status = 'current';
        }
      }
      return newGroup;
    });
    
    try {
      const updatedProgressFromServer = await updateMilestoneProgress(
        initialPlan.id,
        milestoneIdentifier,
        true,
        currentSavingsValue,
        0, 
        nextMilestone?.identifier || null,
        newGroups
      );

      setMilestoneProgress(updatedProgressFromServer);

      if (nextMilestone) {
        if (nextMilestone.groupId === groupOfCurrentMilestone.id) {
          setCurrentMilestoneStep(nextMilestone.subIndex + 1);
        } else {
          // BƯỚC 2: ĐƠN GIẢN HÓA LOGIC
          // Chỉ cần điều hướng. useEffect ở trên sẽ lo việc reset step.
          router.push(`/plan/${initialPlan.id}/plan?milestoneId=${nextMilestone.groupId}`);
        }
      } else {
        router.push(`/plan/${initialPlan.id}/roadmap`);
      }

    } catch (error) {
      console.error("Failed to complete milestone:", error);
    }
  };

  useEffect(() => {
    if (!currentMilestone) return;

    const currentGroupIdInState = currentMilestone.id;
    const currentSubMilestoneInState = currentMilestoneInGroup;

    const items = currentSubMilestoneInState?.items || [];
    const allItemsDone = items.length > 0 && items.every(
      item => item.status === 'completed' || item.status === 'auto-completed'
    );
    
    const isPendingAutoCompletion = items.some(item => item.status === 'completed');

    if (allItemsDone && isPendingAutoCompletion) {
      console.log(`Milestone ${currentMilestone?.id}-${currentStep-1} is pending auto-completion. Navigating...`);
      const nextMilestone = getNextMilestone(milestoneGroups, currentMilestone.id, currentStep - 1);
      
      if (nextMilestone) {
        if (nextMilestone.groupId === currentMilestone.id) {
          setCurrentMilestoneStep(nextMilestone.subIndex + 1);
        } else {
          router.push(`/plan/${initialPlan.id}/plan?milestoneId=${nextMilestone.groupId}`);
        }
      } else {
        router.push(`/plan/${initialPlan.id}/roadmap`);
      }
    }
  }, [milestoneGroups, currentStep, currentMilestone, currentMilestoneInGroup, router, initialPlan.id]);


  // SỬA: THAY ĐỔI DEPENDENCY ĐỂ CHỈ LẮNG NGHE ID
  useEffect(() => {
    // Bất cứ khi nào ID của group trên URL thay đổi,
    // chúng ta sẽ reset step về 1.
    setCurrentMilestoneStep(1);
    // Dependency `currentMilestoneId` là một con số ổn định,
    // nó chỉ thay đổi khi router.push được gọi để chuyển group.
  }, [initialMilestoneId]);


  const handleGoToRoadmap = () => {
    router.push(`/plan/${initialPlan.id}/roadmap`);
  };

  const updateMilestoneStatusesBasedOnCurrentSavings = () => {
    const currentSavings = milestoneProgress?.currentSavings || 0;
    
    const updatedMilestoneGroups = milestoneGroups.map(group => {
      const updatedMilestones = group.milestones.map(milestone => {
        const milestoneAmount = milestone.amountValue || 0;
        
        if (currentSavings >= milestoneAmount) {
          return { ...milestone, status: "done" as const };
        } else {
          return { ...milestone, status: "upcoming" as const };
        }
      });
      
      let groupStatus: "done" | "current" | "upcoming" = "upcoming";
      const allDone = updatedMilestones.every(milestone => milestone.status === "done");
      
      if (allDone) {
        groupStatus = "done";
      } else {
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

    setMilestoneProgress(prev => prev ? {
      ...prev,
      milestoneGroups: updatedMilestoneGroups,
    } : null);
    
    console.log("✅ Updated milestone statuses based on currentSavings:", currentSavings);
  };

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

  // =================================================================
  // SỬA: TÍNH TOÁN MIN VÀ MAX CHO THANH TIẾN TRÌNH
  // =================================================================
  const progressBarValues = useMemo(() => {
    if (!currentMilestoneData || !currentMilestoneInGroup) {
      return { min: 0, max: 0 };
    }

    const currentMax = currentMilestoneInGroup.amountValue;
    let currentMin = 0;

    // Kiểm tra xem có phải là step đầu tiên trong group không
    if (currentStep === 1) {
      // Nếu là step đầu tiên, min là lastDoneAmountValue của cả group
      currentMin = currentMilestoneData.lastDoneAmountValue;
    } else {
      // Nếu không, min là amountValue của step ngay trước đó
      const previousSubMilestone = currentMilestoneData.milestones[currentStep - 2];
      currentMin = previousSubMilestone?.amountValue || currentMilestoneData.lastDoneAmountValue;
    }

    return { min: currentMin, max: currentMax };

  }, [currentMilestoneData, currentMilestoneInGroup, currentStep]);

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
        
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white"
            onClick={handlePreviousMilestone}
            disabled={currentMilestoneIndex === 0 && currentStep === 1}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold">
              {currentMilestoneData ? currentMilestoneData.title : "Cột mốc"}
            </div>
            <div className="text-[14px] text-gray-400">
              {currentMilestoneData ? (
                (() => {
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
            // SỬA: Sử dụng giá trị đã được tính toán chính xác
            min={progressBarValues.min}
            max={progressBarValues.max}
          />
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        <div className="mb-8">
          <MilestoneTaskSection 
            key={`${currentMilestone?.id}-${currentStep}`}
            milestoneId={currentMilestoneInGroup?.groupId || 1} 
            currentMilestone={currentMilestone}
            currentStep={currentStep}
            planId={initialPlan.id}
            plan={initialPlan}
            accumulationMax={currentMilestoneInGroup?.amountValue || 0}
            accumulationMin={currentMilestoneData?.lastDoneAmountValue ?? 0}
            milestones={currentMilestoneData?.milestones || []}
            currentMilestoneInGroup={currentMilestoneInGroup}
            onSavingsUpdate={async (amount) => {
              // Hàm này bây giờ sẽ throw lỗi nếu gặp vấn đề,
              // để component con có thể bắt và xử lý.
              const updatedProgress = await updateCurrentSavings(initialPlan.id, amount);
              
              setMilestoneProgress(prev => {
                if (!prev) return updatedProgress;
                return {
                  ...prev,
                  currentSavings: updatedProgress.currentSavings,
                  savingsPercentage: updatedProgress.savingsPercentage,
                  lastProgressUpdate: updatedProgress.lastProgressUpdate,
                };
              });
            }}
            onMilestoneCompleted={handleMilestoneCompleted}
            isMilestoneCompleted={isCurrentMilestoneDone}
            onGoToRoadmap={() => router.push(`/plan/${initialPlan.id}/roadmap`)}
            isLastMilestone={currentMilestoneIndex === mainMilestones.length - 1}
            // Sửa: hasNextMilestone bao gồm cả milestone con kế tiếp và group kế tiếp
            hasNextMilestone={
              currentStep < totalSteps || // Còn milestone con kế tiếp trong group hiện tại
              currentMilestoneIndex < mainMilestones.length - 1 // Còn group kế tiếp
            }
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
