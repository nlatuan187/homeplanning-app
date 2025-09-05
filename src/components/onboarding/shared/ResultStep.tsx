import { Button } from "@/components/ui/button";
import Image from "next/image";

// We need a type for the result, let's assume it looks like this.
// You might need to create this in your types.ts file.
export interface RecalculationResult {
  success: boolean;
  message: string;
  earliestPurchaseYear?: number;
  error?: string;
}

interface ResultStepProps {
  title: string;
  result: RecalculationResult;
  onContinue: () => void;
}

export default function ResultStep({ title, result, onContinue }: ResultStepProps) {
  return (
    <div className="max-w-5xl mx-auto fixed inset-0 pt-2 flex flex-col z-10 bg-slate-950">
        <div className="relative flex items-center h-10 mb-4 mx-4">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold text-white text-lg">
                {title}
            </div>
        </div>
        <div className="flex-grow flex flex-col items-center justify-center text-center px-4">
            <p className="text-lg text-white/90 max-w-sm mb-8">
              {result.message}
            </p>
            {/* Placeholder for the image/card */}
            <div className="w-48 h-64 bg-slate-700 rounded-lg mb-8 flex items-center justify-center">
                <span className="text-slate-400">Image</span>
            </div>
            {result.earliestPurchaseYear && (
                <p className="text-xl font-bold text-white">
                    Bạn sẽ mua được nhà sớm nhất vào năm {result.earliestPurchaseYear}
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
