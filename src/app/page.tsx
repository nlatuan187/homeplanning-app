"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { checkUserHasPlan } from '@/actions/userActions'; 
import LoadingStep from "@/components/onboarding/shared/LoadingStep";
import { createPlanFromOnboarding } from "@/actions/createPlanFromOnboarding";
import { toast } from "react-hot-toast";
import { OnboardingPlanState } from "@/components/onboarding/types";

export default function Home() {
  const { isSignedIn, userId, isLoaded } = useAuth();
  const router = useRouter();
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
            
            // Gọi server action để tạo plan
            const result = await createPlanFromOnboarding(pendingPlanData);

            if (result.success && result.planId) {
              toast.success("Đã tạo kế hoạch thành công từ thông tin bạn đã cung cấp!");
              localStorage.removeItem('pendingOnboardingPlan'); // Xóa dữ liệu sau khi xử lý
              router.push(`/plan/${result.planId}/familysupport`); // Chuyển đến bước tiếp theo
            } else {
              toast.error(result.error || "Không thể tạo kế hoạch. Vui lòng thử lại.");
              localStorage.removeItem('pendingOnboardingPlan'); // Xóa dữ liệu lỗi
              setIsCheckingPlan(false); // Hiển thị lại onboarding để bắt đầu lại
            }
          } catch (error) {
            toast.error("Dữ liệu tạm thời bị lỗi. Vui lòng bắt đầu lại.");
            localStorage.removeItem('pendingOnboardingPlan');
            setIsCheckingPlan(false);
          }
        } else {
          // Không có dữ liệu tạm, đây là người dùng mới thực sự
          setIsCheckingPlan(false);
        }
      } else if (isLoaded && !isSignedIn) {
        // Guest user, không cần làm gì thêm
        setIsCheckingPlan(false);
      }
    };

    handleUserSession();
  }, [isLoaded, isSignedIn, userId, router]);

  if (!isLoaded || isCheckingPlan) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingStep message="Đang tải..." percentage={100} />
      </div>
    );
  }

  // Both guests and new users without a plan will see the OnboardingFlow.
  return <OnboardingFlow planId={""} />;
}
