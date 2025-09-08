import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export interface RecalculationResult {
  success: boolean;
  message: string;
  earliestPurchaseYear?: number;
  error?: string;
  hasImproved?: boolean;
  hasWorsened?: boolean; // 🔥 Thêm field cho spending case
}

interface ResultStepProps {
  title: string;
  message: string;
  earliestPurchaseYear?: number;
  onContinue: () => void;
  hasImproved?: boolean;
  hasWorsened?: boolean; // 🔥 Thêm prop cho spending case
}

export default function ResultStep({ 
  title, 
  message, 
  earliestPurchaseYear, 
  onContinue, 
  hasImproved,
  hasWorsened 
}: ResultStepProps) {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto fixed inset-0 pt-2 flex flex-col z-10 bg-slate-950">
        <div className="relative flex items-center h-10 mb-4 mx-4">
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
        <div className="flex-grow flex flex-col items-center justify-center text-center px-4">
            <p className="text-lg text-white/90 max-w-sm mb-8 whitespace-pre-line">
              {message}
            </p>
            
            {/* Placeholder for the image/card - emoji phù hợp với từng trường hợp */}
            <div className="w-48 h-64 bg-slate-700 rounded-lg mb-8 flex items-center justify-center">
                <span className="text-4xl">
                  {hasImproved ? "🥳" : "💪"}
                </span>
            </div>
            
            {earliestPurchaseYear && (
                <p className="text-xl font-bold text-white">
                    Bạn sẽ mua được nhà sớm nhất vào năm {earliestPurchaseYear}
                </p>
            )}
        </div>
        <div className="p-4">
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
