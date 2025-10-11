"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OnboardingPlanState } from "../types";
import { Award, ShieldCheck, ArrowLeftIcon } from "lucide-react";

interface SignupPromptProps {
  planData: Partial<OnboardingPlanState> & { id?: string };
  onBack: () => void; // Function to go back to the form
}

// A unique key to store the pending plan in localStorage
const PENDING_PLAN_KEY = "pendingOnboardingPlan";

export default function SignupPrompt({ planData, onBack }: SignupPromptProps) {
  const router = useRouter();

  const handleSignUp = () => {
    try {
      // Save the collected data to localStorage
      localStorage.setItem(PENDING_PLAN_KEY, JSON.stringify(planData));

      if (!planData.id) {
        router.push("/sign-up");
        return;
      }
      // Redirect to the sign-up page, with a redirect to the family support page after completion
      const redirectUrl = `/plan/${planData.id}/familysupport`;
      router.push(`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`);
    } catch (error) {
      console.error("Failed to save pending plan to localStorage", error);
      // Still redirect even if saving fails
      if (planData.id) {
        const redirectUrl = `/plan/${planData.id}/familysupport`;
        router.push(
          `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`
        );
      } else {
        router.push("/sign-up");
      }
    }
  };

  return (
    <div className="flex flex-col h-full flex-grow text-white">
      <header className="relative flex justify-center items-center pt-2">
        <button onClick={onBack} className="absolute left-0 p-2">
          <ArrowLeftIcon className="w-6 h-6 text-white" />
        </button>
      </header>

      <main className="flex-grow flex flex-col items-center text-center px-2 pt-10">
        <p className="text-slate-300 mb-2 text-sm">Bạn sẽ biết</p>
        <h1 className="text-md font-bold mb-10 leading-tight">
          “Tôi có thể mua được căn nhà mơ ước không?”
        </h1>

        <div className="space-y-4 w-full max-w-5xl mb-10">
          <div className="bg-slate-800/50 rounded-lg p-4 text-left flex items-start space-x-4">
            <Award className="h-8 w-8 text-cyan-500 mt-1 flex-shrink-0" />
            <div>
              <h2 className="font-semibold">Sự tham gia của chuyên gia</h2>
              <p className="text-slate-400 text-sm">
                Phép tính được đội ngũ chuyên gia hoạch định tài chính cá nhân
                phối hợp xây dựng
              </p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 text-left flex items-start space-x-4">
            <ShieldCheck className="h-8 w-8 text-cyan-500 mt-1 flex-shrink-0" />
            <div>
              <h2 className="font-semibold">Bảo mật dữ liệu cá nhân</h2>
              <p className="text-slate-400 text-sm">
                Dữ liệu của bạn chỉ được dùng để phục vụ tính toán, không cung
                cấp cho bên thứ ba
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto pb-4">
        <Button
          onClick={handleSignUp}
          className="w-full bg-cyan-500 hover:bg-[#008C96] text-white py-4 text-lg rounded-sm"
        >
          Đăng ký để nhận kết quả
        </Button>
      </footer>
    </div>
  );
}
