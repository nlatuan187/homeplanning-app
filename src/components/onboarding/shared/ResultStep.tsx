import { Button } from "@/components/ui/button";
import { ProjectionResult } from "../types";
import Image from "next/image";

interface ResultStepProps {
  result: ProjectionResult;
  onNextSection: () => void;
}

export default function ResultStep({ result, onNextSection }: ResultStepProps) {
  const icon = result.isAffordable ? "/icons/confetti.png" : "/icons/snail.png";

  return (
    <div className="flex flex-col items-center justify-between text-center h-full flex-grow py-8">
       <div className="flex-grow flex flex-col items-center justify-center">
        <Image src={icon} alt="Result Icon" width={100} height={100} className="mb-6"/>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            {result.isAffordable ? "Kế hoạch khả thi!" : "Kế hoạch chưa khả thi"}
        </h2>
        <p className="text-slate-300 max-w-sm">
            {result.message}
        </p>
      </div>
      <Button 
        onClick={onNextSection} 
        className="w-full bg-white text-slate-900 hover:bg-slate-200 py-3.5 text-base font-semibold rounded-xl shadow-md transition-transform transform active:scale-95"
      >
        Tiếp tục
      </Button>
    </div>
  );
}
