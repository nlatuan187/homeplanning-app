"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlanFromOnboarding } from "@/actions/createPlanFromOnboarding";
import LoadingStep from "./onboarding/shared/LoadingStep";

const PENDING_PLAN_KEY = "pendingOnboardingPlan";

export default function PendingPlanHandler() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true); // Default to false
  const [message, setMessage] = useState("");

  useEffect(() => {
    const processPendingPlan = async () => {
      const pendingPlanJSON = localStorage.getItem(PENDING_PLAN_KEY);

      if (!pendingPlanJSON) {
        // Nothing to do, stop any potential processing state.
        setIsProcessing(false);
        return;
      }

      setMessage("Đang tạo kế hoạch mua nhà...");
      try {
        const pendingPlanData = JSON.parse(pendingPlanJSON);
        const result = await createPlanFromOnboarding(pendingPlanData);
        localStorage.removeItem(PENDING_PLAN_KEY);
        if (result.success && result.planId) {
          // Redirect to the new results page
          router.push(`/plan/${result.planId}/familysupport`);
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
        router.push("/dashboard");
      }
    };
    processPendingPlan();
  }, [router]);

  if (isProcessing) {
    return <LoadingStep message={message} percentage={100}/>;
  }

  return null;
}
