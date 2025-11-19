import { Button } from "@/components/ui/button";
import { Plan } from "@prisma/client";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export interface RecalculationResult {
  caseNumber: number;
  planId: string;
  plan: Plan;
  success: boolean;
  message: string;
  earliestPurchaseYear?: number;
  error?: string;
  hasImproved?: boolean;
  hasWorsened?: boolean; // 🔥 Thêm field cho spending case
}

interface ResultStepProps {
  plan: Plan;
  title: string;
  message: string;
  earliestPurchaseYear?: number;
  caseNumber?: number;
  onContinue: () => void;
  hasImproved?: boolean;
  hasWorsened?: boolean; // 🔥 Thêm prop cho spending case
}

export default function ResultStep({ 
  plan,
  title, 
  message, 
  earliestPurchaseYear, 
  caseNumber,
  onContinue, 
  hasImproved,
  hasWorsened 
}: ResultStepProps) {
  const router = useRouter();

  console.log("caseNumber", caseNumber);
  return (
    <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col z-10 bg-[#121212]">
        <div className="relative flex items-center h-10 mx-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/dashboard`)}
              >
                <ArrowLeftIcon className="w-6 h-6 text-white" />
              </Button>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold text-white text-lg">
                {title}
            </div>
        </div>
        <div className="flex-grow flex flex-col items-center pt-10 text-center px-4">
            <p className="text-lg text-white/90 max-w-sm mb-8 whitespace-pre-line">
              {message}
            </p>
            
            {caseNumber && (
              (caseNumber % 3 === 1) ? (
                <>
                  <div className="rounded-lg mb-8 flex items-center justify-center">
                    <Image src="/onboarding/resultcase1.png" alt="Result" width={320} height={256} />
                  </div>
                  (caseNumber === 1) ? (
                    <p className="text-xl font-bold text-white">
                      Bạn sẽ mua được nhà sớm nhất vào năm {earliestPurchaseYear}
                    </p>
                  ) : (
                    <p className="text-xl font-bold text-white">
                      Thời gian mua được nhà của bạn sớm nhất vẫn là năm {earliestPurchaseYear}
                    </p>
                  )
                </>
              ) : (
                (caseNumber % 3 === 2) ? (
                  <>
                    <div className="rounded-lg mb-8 flex items-center justify-center">
                      <Image src="/onboarding/resultcase3.png" alt="Result" width={320} height={256} />
                    </div>
                      <p className="text-xl font-bold text-white">
                        Tuy nhiên, bạn vẫn còn cơ hội. Tiếp tục tìm hiểu nhé?
                      </p>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg mb-8 flex items-center justify-center">
                      <Image src="/onboarding/resultcase2.png" alt="Result" width={320} height={256} />
                    </div>
                    <p className="text-xl font-bold text-white">
                      Bạn sẽ mua được nhà sớm nhất vào năm {earliestPurchaseYear}
                    </p>
                  </>
                )
              )
            )}
        </div>
        <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 bg-[#121212] border-t border-slate-800 z-10">
          <Button
                onClick={onContinue}
                className="w-full bg-white text-slate-900 hover:bg-slate-200 text-lg font-semibold rounded-sm shadow-lg"
            >
                Tiếp tục
            </Button>
        </div>
    </div>
  );
}
