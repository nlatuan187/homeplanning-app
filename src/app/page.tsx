"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { checkUserHasPlan } from '@/actions/userActions';
import LoadingStep from "@/components/onboarding/shared/LoadingStep";
import { createPlanFromOnboarding } from "@/actions/createPlanFromOnboarding";
import { toast } from "react-hot-toast";
import { OnboardingPlanState } from "@/components/onboarding/types";

function HomeContent() {
  const { isSignedIn, userId, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");
  const initialStep = stepParam === "form1" ? "form1" : "intro";
  const [isCheckingPlan, setIsCheckingPlan] = useState(true);

  useEffect(() => {
    const handleUserSession = async () => {
      if (isLoaded && isSignedIn && userId) {
        const hasPlan = await checkUserHasPlan(userId);
        if (hasPlan) {
          router.push('/dashboard');
          return;
        }

        // *** LOGIC MỚI BẮT ĐẦU TỪ ĐÂY ***
        // User đã đăng nhập nhưng chưa có plan, kiểm tra localStorage
        const pendingPlanJSON = localStorage.getItem('pendingOnboardingPlan');
        if (pendingPlanJSON) {
          try {
            const pendingPlanData: OnboardingPlanState = JSON.parse(pendingPlanJSON);
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
          console.log("No pending plan. Step param:", stepParam);
          // Không có dữ liệu tạm, đây là người dùng mới thực sự
          // Nếu chưa có param step=form1 thì redirect để thêm vào
          if (!stepParam) {
            console.log("Redirecting to add step param");
            router.replace('/?step=form1');
            return;
          }
          console.log("Setting isCheckingPlan to false");
          setIsCheckingPlan(false);
        }
      } else if (isLoaded && !isSignedIn) {
        console.log("Guest user");
        // Guest user, không cần làm gì thêm
        setIsCheckingPlan(false);
      }
    };

    handleUserSession();
  }, [isLoaded, isSignedIn, userId, router, stepParam]);

  if (!isLoaded || isCheckingPlan) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingStep message="Đang tải..." percentage={100} />
      </div>
    );
  }

  // Both guests and new users without a plan will see the OnboardingFlow.
  return <OnboardingFlow planId={""} initialStep={initialStep} />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><LoadingStep message="Đang tải..." percentage={100} /></div>}>
      <HomeContent />
    </Suspense>
  );
}
