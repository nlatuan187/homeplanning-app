"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlanFromOnboarding } from "@/actions/createPlanFromOnboarding";
import LoadingOverlay from "./ui/loading-overlay";

const PENDING_PLAN_KEY = "pendingOnboardingPlan";

export default function PendingPlanHandler() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true); // Default to false
  const [message, setMessage] = useState("Kiểm tra dữ liệu của bạn...");

  useEffect(() => {
    const processPendingPlan = async () => {
      const pendingPlanJSON = localStorage.getItem(PENDING_PLAN_KEY);

      if (!pendingPlanJSON) {
        // Nothing to do, stop any potential processing state.
        setIsProcessing(false);
        return;
      }

      setMessage("Tính toán khả năng mua nhà...");
      try {
        const pendingPlanData = JSON.parse(pendingPlanJSON);
        const result = await createPlanFromOnboarding(pendingPlanData);
        console.log("result", result);
        localStorage.removeItem(PENDING_PLAN_KEY);
        if (result.success && result.planId) {
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
        router.push("/dashboard");
      }
    };
    processPendingPlan();
  }, [router]);

  if (isProcessing) {
    return <LoadingOverlay messages={[message]} />;
  }

  return null;
}
