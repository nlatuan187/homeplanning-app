"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlanFromOnboarding } from "@/actions/createPlanFromOnboarding";
import { checkUserPlanStatus } from "@/actions/checkUserPlanStatus";
import { updatePlanFromOnboarding } from "@/actions/updatePlanFromOnboarding";
import { OnboardingPlanState } from "./onboarding/types";
import LoadingOverlay from "./ui/loading-overlay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";

const PENDING_PLAN_KEY = "pendingOnboardingPlan";
// Add a new key for session storage to prevent re-running
const PROCESSED_PENDING_PLAN_KEY = "processedPendingPlan";

export default function PendingPlanHandler() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false); // Default to false
  const [message, setMessage] = useState("Kiểm tra dữ liệu của bạn...");
  
  // State for handling existing users
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [pendingData, setPendingData] = useState<Partial<OnboardingPlanState> | null>(null);
  const [existingPlanId, setExistingPlanId] = useState<string | null>(null);

  useEffect(() => {
    const processPendingPlan = async () => {
      // 1. Check if we've already processed this in the current session
      if (sessionStorage.getItem(PROCESSED_PENDING_PLAN_KEY)) {
        setIsProcessing(false); // Ensure no loading overlay shows
        return;
      }

      const pendingPlanJSON = localStorage.getItem(PENDING_PLAN_KEY);
      if (!pendingPlanJSON) {
        // Nothing to do, stop any potential processing state.
        setIsProcessing(false);
        return;
      }

      // 2. A pending plan exists and we haven't processed it this session.
      // IMMEDIATELY set the session flag to prevent re-runs on navigation.
      sessionStorage.setItem(PROCESSED_PENDING_PLAN_KEY, "true");
      setIsProcessing(true); // Now, we can safely show the loading overlay

      const data: Partial<OnboardingPlanState> = JSON.parse(pendingPlanJSON);
      setPendingData(data);

      try {

        const { hasPlan, planId } = await checkUserPlanStatus();
        

        if (hasPlan && planId) {
          // User has a plan, show them a choice
          setExistingPlanId(planId);
          setShowChoiceModal(true);
          setIsProcessing(false); // Stop loading to show the modal
        } else {
          // New user, create the plan directly
          setMessage("Tạo kế hoạch mới...");
          const result = await createPlanFromOnboarding(data);
          handleActionResult(result);
        }
      } catch (error) {
        console.error("Error checking user plan status:", error);
        cleanupAndRedirect();
      }
    };

    processPendingPlan();
  }, [router]);

  const cleanupAndRedirect = (path = "/dashboard") => {
    localStorage.removeItem(PENDING_PLAN_KEY);
    // We don't remove the session key here. It should persist for the whole session.
    router.push(path);
  };

  const handleActionResult = (result: { success: boolean; planId?: string; error?: string }) => {
    if (result.success && result.planId) {
      cleanupAndRedirect(`/plan/${result.planId}/results`);
    } else {
      console.error("Action failed:", result.error);
      cleanupAndRedirect();
    }
  };

  const handleUpdate = async () => {
    if (!pendingData || !existingPlanId) return;
    setIsProcessing(true);
    setMessage("Đang cập nhật kế hoạch...");
    const result = await updatePlanFromOnboarding(existingPlanId, pendingData);
    handleActionResult(result);
    setShowChoiceModal(false);
  };

  const handleCreateNew = async () => {
    if (!pendingData) return;
    setIsProcessing(true);
    setMessage("Đang tạo kế hoạch mới...");
    const result = await createPlanFromOnboarding(pendingData);
    handleActionResult(result);
    setShowChoiceModal(false);
  };

  const handleCancel = () => {
    setShowChoiceModal(false);
    cleanupAndRedirect();
  };


  if (isProcessing) {
    return <LoadingOverlay messages={[message]} />;
  }

  if (showChoiceModal) {
    return (
      <Dialog open={showChoiceModal} onOpenChange={setShowChoiceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bạn đã có kế hoạch từ trước</DialogTitle>
            <DialogDescription>
              Chúng tôi nhận thấy bạn vừa hoàn thành một kịch bản mua nhà mới. Bạn muốn làm gì với nó?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Hủy bỏ
            </Button>
            <Button onClick={handleUpdate}>Cập nhật kế hoạch hiện tại</Button>
            <Button onClick={handleCreateNew}>Lưu thành kế hoạch mới</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
