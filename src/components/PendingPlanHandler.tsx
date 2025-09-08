"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlanFromOnboarding } from "@/actions/createPlanFromOnboarding";
import LoadingOverlay from "./ui/loading-overlay";

// This key must match the one used in SignupPrompt.tsx
const PENDING_PLAN_KEY = "pendingOnboardingPlan";

export default function PendingPlanHandler() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [message, setMessage] = useState("Kiểm tra dữ liệu của bạn...");

  useEffect(() => {
    // This effect should only run once on component mount.
    const processPendingPlan = async () => {
      const pendingPlanJSON = localStorage.getItem(PENDING_PLAN_KEY);

      if (!pendingPlanJSON) {
        // Nothing to do, stop showing loading state.
        setIsProcessing(false);
        return;
      }

      setMessage("Đang tạo kế hoạch cho bạn...");

      try {
        const pendingPlanData = JSON.parse(pendingPlanJSON);
        const result = await createPlanFromOnboarding(pendingPlanData);

        // Clear the data regardless of the outcome to prevent re-runs
        localStorage.removeItem(PENDING_PLAN_KEY);

        if (result.success && result.planId) {
          setMessage("Tạo kế hoạch thành công! Đang chuyển hướng...");
          // Redirect to the new results page
          router.push(`/plan/${result.planId}/results`);
        } else {
          // If creation fails, log the error and go to the general dashboard
          console.error(
            "Failed to create plan from onboarding data:",
            result.error
          );
          router.push("/dashboard");
        }
      } catch (error) {
        // Catch any other errors, clear storage, and redirect
        console.error("Error processing pending plan:", error);
        localStorage.removeItem(PENDING_PLAN_KEY);
        router.push("/dashboard");
      }
    };

    processPendingPlan();
  }, [router]);

  // While processing, show a loading overlay to prevent user interaction.
  if (isProcessing) {
    return (
        <LoadingOverlay messages={[message]} />
    );
  }

  return null; // Render nothing once done (if there was no plan).
}
