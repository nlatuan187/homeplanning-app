"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plan, MilestoneProgress } from "@prisma/client";
import { getMilestonesByGroup, MilestoneGroup } from "@/lib/isMilestoneUnlocked";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronsUpDown, Lock } from "lucide-react";
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

interface MilestoneData {
  milestoneId: number;
  title: string;
  status: "done" | "current" | "upcoming";
  percent?: number;
  amountValue?: number | null;
  currentSavings: number;
  lastDoneAmountValue: number;
  progress: number;
}

function getGoalNumber(title: string): number {
  const match = title.match(/(?:Cột mốc số|Goal)\s+(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function calculateEstimateText(
  currentAmountValue: number | null,
  previousAmountValue: number | null,
  plan: PlanWithMilestoneProgress
): string {
  if (!currentAmountValue || !plan) {
    return "Chưa thể tính toán";
  }

  // a = amountValue hiện tại - amountValue cột mốc trước
  const a = currentAmountValue - (previousAmountValue || 0);
  
  // b = Số tiền được tích lũy được hàng tháng: Lương 1 tháng - chi tiêu 1 tháng
  const monthlySavings = (
    plan.userMonthlyIncome + 
    (plan.hasCoApplicant ? (plan.coApplicantMonthlyIncome || 0) : 0) + 
    (plan.monthlyOtherIncome || 0) - 
    plan.monthlyLivingExpenses - 
    (plan.monthlyNonHousingDebt || 0) - 
    (plan.currentAnnualInsurancePremium || 0) / 12
  ) || 0;
  
  if (monthlySavings <= 0) {
    return "Không thể tích lũy với thu nhập hiện tại";
  }
  
  // estimateTime = Số nguyên đầu tiên <= (a / b)
  const estimateTime = Math.floor(a / monthlySavings);
  
  if (estimateTime <= 0) {
    return "Đã đạt mục tiêu";
  }
  
  if (estimateTime === 1) {
    return "khoảng 1 tháng";
  } else if (estimateTime < 12) {
    return `khoảng ${estimateTime} tháng`;
  } else {
    const years = Math.floor(estimateTime / 12);
    const months = estimateTime % 12;
    if (months === 0) {
      return `khoảng ${years} năm`;
    } else {
      return `khoảng ${years} năm ${months} tháng`;
    }
  }
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
  }, [initialMilestoneId, router.asPath]); // Thêm router.asPath để trigger khi URL thay đổi

  // State để lưu dữ liệu MilestoneProgress
  const [milestoneProgress, setMilestoneProgress] = useState<MilestoneProgress | null>(
    initialPlan.milestoneProgress || null 
  );
  
  // Parse currentMilestoneData safely
  const currentMilestoneData = milestoneProgress?.currentMilestoneData 
    ? (typeof milestoneProgress.currentMilestoneData === 'string' 
        ? JSON.parse(milestoneProgress.currentMilestoneData) 
        : milestoneProgress.currentMilestoneData) as MilestoneData
    : null;

  // Parse milestoneGroups để lấy danh sách tất cả milestones
  const milestoneGroups = milestoneProgress?.milestoneGroups 
    ? (typeof milestoneProgress.milestoneGroups === 'string' 
        ? JSON.parse(milestoneProgress.milestoneGroups) 
        : milestoneProgress.milestoneGroups) as MilestoneGroup[]
    : [];

  // Thay đổi: Lấy TẤT CẢ milestone thay vì chỉ 6 milestone chính
  const allMilestones = milestoneGroups.flatMap(group => 
    group.milestones.map(milestone => ({
      id: getGoalNumber(milestone.title), // Lấy goal number từ title
      title: milestone.title,
      status: milestone.status,
      percent: milestone.percent,
      amountValue: milestone.amountValue,
      amount: milestone.amount,
    }))
  );

  // Sắp xếp theo id để đảm bảo thứ tự đúng
  const sortedMilestones = useMemo(() => {
    return allMilestones.sort((a, b) => a.id - b.id);
  }, [allMilestones.length, JSON.stringify(allMilestones)]);

  // Logic mới: Cập nhật status dựa trên currentSavings và tìm currentStep thực tế
  const updateMilestoneStatusBasedOnSavings = () => {
    const currentSavings = milestoneProgress?.currentSavings || 0;
    
    // Cập nhật status cho tất cả milestones dựa trên currentSavings
    const updatedMilestoneGroups = milestoneGroups.map(group => {
      const updatedMilestones = group.milestones.map(milestone => {
        const milestoneAmount = milestone.amountValue || 0;
        
        if (currentSavings >= milestoneAmount) {
          return { ...milestone, status: "done" as const };
        } else {
          return { ...milestone, status: "upcoming" as const };
        }
      });
      
      return {
        ...group,
        milestones: updatedMilestones
      };
    });

    // Tìm milestone đầu tiên chưa hoàn thành để set thành "current"
    // NHƯNG CHỈ set "current" nếu không phải đang trong quá trình completion
    let foundCurrent = false;
    const finalUpdatedGroups = updatedMilestoneGroups.map(group => {
      const finalMilestones = group.milestones.map(milestone => {
        if (!foundCurrent && milestone.status === "upcoming" && !showMilestoneCompleted) {
          foundCurrent = true;
          return { ...milestone, status: "current" as const };
        }
        return milestone;
      });
      
      return {
        ...group,
        milestones: finalMilestones
      };
    });

    // Cập nhật local state
    setMilestoneProgress(prev => prev ? {
      ...prev,
      milestoneGroups: finalUpdatedGroups,
    } : null);
  };

  // Tìm currentStep thực tế dựa trên status "current"
  const getCurrentStepFromMilestones = (): number => {
    for (const group of milestoneGroups) {
      for (const milestone of group.milestones) {
        if (milestone.status === "current") {
          return getGoalNumber(milestone.title);
        }
      }
    }
    return 1; // Fallback
  };

  // Update totalSteps để phản ánh số milestone thực tế
  const totalSteps = sortedMilestones.length;
  const currentStep = getCurrentStepFromMilestones(); // Sử dụng function mới

  // Tìm index của milestone hiện tại trong danh sách TẤT CẢ milestone - KHÔNG thay đổi khi swipe
  const currentMilestoneIndex = sortedMilestones.findIndex(m => m.id === (currentMilestoneData?.milestoneId || currentStep));

  // Kiểm tra xem milestone hiện tại có status "done" không
  const isCurrentMilestoneDone = currentMilestoneData?.status === "done";

  // Nếu có initialMilestoneId, tìm và set milestone tương ứng
  useEffect(() => {
    if (initialMilestoneId && sortedMilestones.length > 0) {
      const targetMilestone = sortedMilestones.find(m => m.id === initialMilestoneId);
      if (targetMilestone) {
        updateCurrentMilestone(targetMilestone);
      }
    }
  }, [initialMilestoneId, sortedMilestones]);

  // In ra trạng thái của PlanPageClient
  useEffect(() => {
    console.log("=== PlanPageClient Debug Info ===");
    console.log("Current Milestone Data:", currentMilestoneData);
    console.log("Current Step (from status):", currentStep);
    console.log("Current Milestone Status:", currentMilestoneData?.status);
    console.log("isCurrentMilestoneDone:", isCurrentMilestoneDone);
    console.log("showMilestoneCompleted:", showMilestoneCompleted);
    console.log("justCompletedMilestoneId:", justCompletedMilestoneId);
    console.log("Current Savings:", milestoneProgress?.currentSavings);
    console.log("Current Milestone ID:", currentMilestoneData?.milestoneId);
    console.log("================================");
  }, [currentMilestoneData, currentStep, isCurrentMilestoneDone, showMilestoneCompleted, justCompletedMilestoneId, milestoneProgress?.currentSavings]);

  // Update handlePreviousMilestone và handleNextMilestone - CHỈ thay đổi view, KHÔNG thay đổi currentStep
  const handlePreviousMilestone = () => {
    if (currentMilestoneIndex > 0) {
      const previousMilestone = sortedMilestones[currentMilestoneIndex - 1];
      updateCurrentMilestone(previousMilestone);
      
      // Cập nhật URL với milestoneId mới
      router.push(`/plan/${initialPlan.id}/plan?milestoneId=${previousMilestone.id}`);
    }
  };

  // Thêm state để track xem có phải đang chuyển từ MilestoneCompleted không
  const [isTransitioningFromCompleted, setIsTransitioningFromCompleted] = useState(false);

  // Modify the handleNextMilestone function - CHỈ thay đổi view
  const handleNextMilestone = () => {
    if (currentMilestoneIndex < sortedMilestones.length - 1) {
      const nextMilestone = sortedMilestones[currentMilestoneIndex + 1];
      
      // Set flag để biết đang transition từ MilestoneCompleted
      setIsTransitioningFromCompleted(true);
      setShowMilestoneCompleted(false);
      
      updateCurrentMilestone(nextMilestone);
      
      // Cập nhật URL với milestoneId mới
      router.push(`/plan/${initialPlan.id}/plan?milestoneId=${nextMilestone.id}`);
      
      // Reset flag sau một khoảng thời gian ngắn
      setTimeout(() => {
        setIsTransitioningFromCompleted(false);
      }, 1000);
    }
  };

  const updateCurrentMilestone = (milestone: any) => {
    // Tìm milestone trước đó để lấy lastDoneAmountValue
    const currentIndex = sortedMilestones.findIndex(m => m.id === milestone.id);
    const previousMilestone = currentIndex > 0 ? sortedMilestones[currentIndex - 1] : null;
    
    // Nếu là milestone đầu tiên, dùng initialSavings, nếu không thì dùng amountValue của milestone trước
    const lastDoneAmountValue = currentIndex === 0 
      ? (initialPlan.initialSavings || 0) 
      : (previousMilestone?.amountValue || 0);
    
    const newMilestoneData = {
      milestoneId: milestone.id,
      title: milestone.title,
      status: milestone.status,
      percent: milestone.percent,
      amountValue: milestone.amountValue,
      currentSavings: milestoneProgress?.currentSavings || 0,
      lastDoneAmountValue: lastDoneAmountValue,
      progress: currentMilestoneData?.progress || 0,
    };

    // Chỉ update local state cho view, không update database
    setMilestoneProgress(prev => prev ? {
      ...prev,
      currentMilestoneData: newMilestoneData,
    } : null);
  };

  // Handle milestone completion
  const handleMilestoneCompleted = async (milestoneId: number) => {
    console.log("handleMilestoneCompleted called with milestoneId:", milestoneId);
    
    try {
      // Cập nhật milestone progress trong database
      const updatedProgress = await updateMilestoneProgressOnCompletion(initialPlan.id, milestoneId);
      
      // Cập nhật local state
      setMilestoneProgress(updatedProgress);
      
      // Set justCompletedMilestoneId và show MilestoneCompleted
      setJustCompletedMilestoneId(milestoneId);
      setShowMilestoneCompleted(true);
      
      // Cập nhật URL để reflect milestone completion
      router.push(`/plan/${initialPlan.id}/plan?milestoneId=${milestoneId}&completed=true`);
    } catch (error) {
      console.error("Error handling milestone completion:", error);
    }
  };

  // THÊM flag này
  const isUpdatingFromUser = useRef(false);

  // Tự động cập nhật status khi currentSavings thay đổi
  useEffect(() => {
    console.log("🔍 useEffect triggered - currentSavings:", milestoneProgress?.currentSavings);
    console.log("🔍 isUpdatingFromUser.current:", isUpdatingFromUser.current);
    console.log("🔍 isTransitioningFromCompleted:", isTransitioningFromCompleted);
    console.log("🔍 showMilestoneCompleted:", showMilestoneCompleted);
    
    // Không auto-complete nếu đang transition từ MilestoneCompleted hoặc đang show completed
    // HOẶC đang cập nhật từ user action
    if (milestoneProgress?.currentSavings !== undefined && 
        !isTransitioningFromCompleted && 
        !showMilestoneCompleted && 
        !isUpdatingFromUser.current) { // ← Kiểm tra ref
      console.log("🔍 Calling updateMilestoneStatusBasedOnSavings()");
      updateMilestoneStatusBasedOnSavings();
    } else {
      console.log("🔍 Skipping updateMilestoneStatusBasedOnSavings()");
    }
  }, [milestoneProgress?.currentSavings, isTransitioningFromCompleted, showMilestoneCompleted]);

  // Calculate estimate text
  const estimateText = calculateEstimateText(
    currentMilestoneData?.amountValue,
    currentMilestoneData?.lastDoneAmountValue,
    initialPlan
  );

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
              
              // Chuyển đến milestone tiếp theo
              const nextMilestoneId = (justCompletedMilestoneId || 0) + 1;
              if (nextMilestoneId <= sortedMilestones.length) {
                // Đảm bảo chuyển đến trang plan, không phải completed
                router.push(`/plan/${initialPlan.id}/plan?milestoneId=${nextMilestoneId}`);
              } else {
                router.push(`/plan/${initialPlan.id}/roadmap`);
              }
            }}
            planId={initialPlan.id}
            totalMilestones={sortedMilestones.length}
            isLastMilestone={justCompletedMilestoneId === sortedMilestones.length}
            amountValue={currentMilestoneData?.amountValue}
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
              Cột mốc số {currentMilestoneData ? currentMilestoneData.milestoneId : "1"}
            </div>
            <div className="text-[14px] text-gray-400">
              {currentMilestoneData ? (
                currentMilestoneData.amountValue != null ? (
                  currentMilestoneData.amountValue >= 1000000000 ? (
                    `Tích lũy đạt ${(currentMilestoneData.amountValue / 1000000000).toFixed(1)} tỷ`
                  ) : currentMilestoneData.amountValue >= 1000000 ? (
                    `Tích lũy đạt ${(currentMilestoneData.amountValue / 1000000).toFixed(1)} triệu`
                  ) : (
                    `Tích lũy đạt ${Math.round(currentMilestoneData.amountValue).toLocaleString()}`
                  )
                ) : (
                  "Tích lũy đạt mục tiêu"
                )
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
            disabled={currentMilestoneIndex === sortedMilestones.length - 1}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
        
        <Button variant="ghost" size="icon" className="text-white">
          <ChevronsUpDown className="h-6 w-6" />
        </Button>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        {/* Milestone Steps */}
        <div className="mb-8">
          <MilestoneSteps 
            totalSteps={totalSteps} 
            currentStep={currentStep} 
          />
        </div>

        {/* Accumulation Progress */}
        <div className="mb-4">
          <AccumulationProgress 
            current={milestoneProgress?.currentSavings ?? 0}
            min={currentMilestoneData?.lastDoneAmountValue ?? 0}
            max={currentMilestoneData?.amountValue ?? 0}
            estimateText={estimateText}
          />
        </div>
      </div>

      {/* Hiển thị nội dung dựa trên status của milestone */}
      {currentMilestoneData?.status === "upcoming" ? (
        <div className="container mx-auto max-w-5xl px-4 py-6">
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Lock className="h-16 w-16 text-gray-400" />
              <h3 className="text-xl font-semibold text-white">
                Hãy hoàn thành các cột mốc trước để mở khoá cột mốc này
              </h3>
              <p className="text-gray-400 text-sm">
                Bạn cần hoàn thành các cột mốc trước đó để có thể truy cập vào cột mốc này
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="container mx-auto max-w-5xl px-4 py-6">
          <div className="mb-8">
            <MilestoneTaskSection 
              milestoneId={currentMilestoneData?.milestoneId || 1} 
              planId={initialPlan.id}
              plan={initialPlan}
              accumulationMax={currentMilestoneData?.amountValue ?? 0}
              accumulationMin={currentMilestoneData?.lastDoneAmountValue ?? 0}
              onSavingsUpdate={async (amount) => {
                console.log("🔄 onSavingsUpdate called with amount:", amount);
                console.log("🔄 Current savings before update:", milestoneProgress?.currentSavings);
                
                // Đặt flag để tắt useEffect NGAY LẬP TỨC
                isUpdatingFromUser.current = true;
                console.log("🔄 Set isUpdatingFromUser.current = true");
                
                try {
                  // Cập nhật database trước
                  console.log("📤 Calling updateCurrentSavings...");
                  const updatedProgress = await updateCurrentSavings(initialPlan.id, amount);
                  console.log("✅ Database updated, new currentSavings:", updatedProgress.currentSavings);
                  
                  // Sau đó cập nhật local state với dữ liệu từ database
                  setMilestoneProgress(updatedProgress);
                  console.log("✅ Local state updated");
                  
                } catch (error) {
                  console.error("❌ Error updating current savings:", error);
                  // Fallback: chỉ cập nhật local state nếu database fail
                  setMilestoneProgress(prev => {
                    const newCurrentSavings = prev ? prev.currentSavings + amount : amount;
                    console.log("🔄 Fallback: updating local state", prev?.currentSavings, "->", newCurrentSavings);
                    return prev ? {
                      ...prev,
                      currentSavings: newCurrentSavings,
                      savingsPercentage: prev.housePriceProjected > 0 
                        ? Math.round((newCurrentSavings / prev.housePriceProjected) * 100)
                        : 0
                    } : null;
                  });
                } finally {
                  // QUAN TRỌNG: Tăng thời gian delay để đảm bảo useEffect không trigger
                  setTimeout(() => {
                    console.log("🔄 Reset isUpdatingFromUser.current = false");
                    isUpdatingFromUser.current = false;
                  }, 100); // ← Tăng từ 100ms lên 500ms
                }
              }}
              onMilestoneCompleted={() => handleMilestoneCompleted(currentMilestoneData?.milestoneId || 1)}
              isMilestoneCompleted={isCurrentMilestoneDone}
            />
          </div>
        </div>
      )}

      <AddCashflowModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(text) => {
          console.log("Add task:", text);
        }}
      />
  
    </main>
  );
}
