"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import LoadingStep from "@/components/onboarding/shared/LoadingStep";
import { createPlanFromOnboarding } from "@/actions/createPlanFromOnboarding";
import { toast } from "react-hot-toast";
import { OnboardingPlanState } from "@/components/onboarding/types";
import { getPlan } from "@/actions/onboardingActions";

export default function HomeClient() {
    const { isSignedIn, userId, isLoaded } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const stepParam = searchParams.get("step");
    const initialStep = stepParam === "form1" ? "form1" : "intro";
    const [isCheckingPlan, setIsCheckingPlan] = useState(true);
    const [planData, setPlanData] = useState<Partial<OnboardingPlanState>>({});
    const [planId, setPlanId] = useState("");

    useEffect(() => {
        const handleUserSession = async () => {
            if (isLoaded && isSignedIn && userId) {
                // Note: The server component wrapper (page.tsx) already checked if the user has a plan.
                // If we are here, it means the user does NOT have a plan (or the check failed/was skipped).
                // So we only need to check for pending local storage data.

                const pendingPlanJSON = localStorage.getItem('pendingOnboardingPlan');
                if (pendingPlanJSON) {
                    try {
                        const pendingPlanData: OnboardingPlanState = JSON.parse(pendingPlanJSON);

                        // Call server action to create plan
                        const result = await createPlanFromOnboarding(pendingPlanData);

                        if (result.success && result.planId) {
                            toast.success("Đã tạo kế hoạch thành công từ thông tin bạn đã cung cấp!");
                            localStorage.removeItem('pendingOnboardingPlan');
                            router.push(`/plan/${result.planId}/familysupport`);
                        } else {
                            toast.error(result.error || "Không thể tạo kế hoạch. Vui lòng thử lại.");
                            localStorage.removeItem('pendingOnboardingPlan');
                            setIsCheckingPlan(false);
                        }
                    } catch (error) {
                        toast.error("Dữ liệu tạm thời bị lỗi. Vui lòng bắt đầu lại.");
                        localStorage.removeItem('pendingOnboardingPlan');
                        setIsCheckingPlan(false);
                    }
                } else {
                    // No pending data, treat as new user
                    // If logged in but no plan, skip intro and go to form1
                    if (!stepParam) {
                        router.replace('/?step=form1');
                        return;
                    }
                    setIsCheckingPlan(false);
                }
            } else if (isLoaded && !isSignedIn) {
                // Guest user
                setIsCheckingPlan(false);
            }
        };

        // Load existing plan data if user is logged in
        const loadExistingPlan = async () => {
            if (isLoaded && isSignedIn && userId) {
                try {
                    const response = await fetch('/api/user/plan');
                    if (response.ok) {
                        const data = await response.json();
                        if (data.plan) {
                            setPlanId(data.plan.id);
                            // Convert DB values back to UI format
                            setPlanData({
                                targetHousePriceN0: data.plan.targetHousePriceN0 / 1000, // triệu → tỷ
                                yearsToPurchase: data.plan.yearsToPurchase + new Date().getFullYear(), // relative → absolute
                                initialSavings: data.plan.initialSavings,
                                userMonthlyIncome: data.plan.userMonthlyIncome,
                                monthlyLivingExpenses: data.plan.monthlyLivingExpenses,
                                hasCoApplicant: data.plan.hasCoApplicant,
                                targetHouseType: data.plan.targetHouseType,
                                targetLocation: data.plan.targetLocation,
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to load plan:', error);
                }
            }
        };

        handleUserSession();
        loadExistingPlan();
    }, [isLoaded, isSignedIn, userId, router, stepParam]);

    if (!isLoaded || isCheckingPlan) {
        return (
            <div className="flex h-screen items-center justify-center">
                <LoadingStep message="Đang tải..." percentage={100} />
            </div>
        );
    }

    return <OnboardingFlow planId={planId} initialStep={initialStep} initialData={planData} />;
}
