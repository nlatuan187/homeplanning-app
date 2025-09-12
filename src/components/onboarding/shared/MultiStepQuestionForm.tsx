"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { OnboardingPlanState } from "../types";
import ProgressBar from "./ProgressBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Home } from "lucide-react"; // Thêm 'Home' vào đây
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// Define the structure for a single question
export interface Question {
  key: keyof OnboardingPlanState;
  text: string;
  type: "options" | "number";
  options?: { label: string; value: any }[];
  unit?: string;
  condition?: (answers: Partial<OnboardingPlanState>) => boolean;
}

interface MultiStepQuestionFormProps {
  questions: Question[];
  onSubmit: (data: Partial<OnboardingPlanState>) => void;
  title: string;
  subtitle?: string;
  defaultValues?: Partial<OnboardingPlanState>; // Prop mới để nhận giá trị mặc định
  onDataChange?: (data: {
    formData: Partial<OnboardingPlanState>;
    touchedFields: Record<string, boolean>;
  }) => void; // Cập nhật để gửi cả touchedFields
  showDashboardButton?: boolean; // Prop to control dashboard button visibility
}

export default function MultiStepQuestionForm({
  questions,
  onSubmit,
  title,
  subtitle,
  defaultValues = {}, // Gán giá trị mặc định là object rỗng
  onDataChange, // Thêm vào destructuring
  showDashboardButton = true, // Default to true for backward compatibility
}: MultiStepQuestionFormProps) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // Khởi tạo formData với giá trị từ defaultValues
  const [formData, setFormData] = useState<Partial<OnboardingPlanState>>(defaultValues);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({}); // State mới

  // useEffect để gọi onDataChange khi formData hoặc touchedFields thay đổi
  useEffect(() => {
    if (onDataChange) {
      onDataChange({ formData, touchedFields });
    }
  }, [formData, touchedFields, onDataChange]);

  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => !q.condition || q.condition(formData));
  }, [questions, formData]);

  const currentQuestion = visibleQuestions[currentQuestionIndex];
  const currentValue = currentQuestion ? formData[currentQuestion.key] : undefined;
  
  const visibleQuestionsRef = useRef(visibleQuestions);
  useEffect(() => {
    visibleQuestionsRef.current = visibleQuestions;
  }, [visibleQuestions]);


  const handleInputChange = (value: any) => {
    setFormData((prev) => ({ ...prev, [currentQuestion.key]: value }));
    // Đánh dấu trường này là đã được tương tác
    if (!touchedFields[currentQuestion.key]) {
      setTouchedFields((prev) => ({ ...prev, [currentQuestion.key]: true }));
    }
  };

  const goToNext = () => {
    if (currentQuestionIndex < visibleQuestionsRef.current.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      onSubmit(formData);
    }
  };

  const handleOptionClick = (value: any) => {
    handleInputChange(value);
    setTimeout(() => {
      goToNext();
    }, 150);
  };

  const goToPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const isLastQuestion = currentQuestionIndex === visibleQuestions.length - 1;

  const renderInput = useMemo(() => {
    if (!currentQuestion) return null;
    if (currentQuestion.type === 'options' && currentQuestion.options) {
      return (
        <div className="grid grid-cols-1 gap-3 w-full">
          {currentQuestion.options.map(option => (
            <Button
              key={option.label}
              variant={"outline"}
              onClick={() => handleOptionClick(option.value)}
              className={`w-full py-6 text-base justify-start pl-4 transition-all duration-200 ${currentValue === option.value ? 'border-green-500 text-green-500' : 'border-slate-600 text-white hover:bg-slate-800 hover:text-white'}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      );
    }
    
    if (currentQuestion.type === 'number') {
      // Lấy giá trị mặc định cho câu hỏi hiện tại
      const defaultValue = defaultValues[currentQuestion.key];
      const placeholderText = String(defaultValue);

      return (
        <div className="relative w-full">
            <Input
              type="number"
              value={currentValue as string || ''}
              onChange={(e) => handleInputChange(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-800 border-slate-600 text-white h-14 text-lg pl-4 pr-24"
              placeholder={placeholderText}
            />
            {currentQuestion.unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{currentQuestion.unit}</span>}
        </div>
      );
    }
    
    return null;
  // Thêm defaultValues vào dependency array của useMemo
  }, [currentQuestion, currentValue, defaultValues]);

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="flex flex-col h-full flex-grow w-full">
      {/* Header Section */}
      <div>
        {/* Navigation: Uses absolute positioning for perfect centering */}
        <div className="relative flex items-center h-10 mb-4 mx-4">
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrev}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="h-12 w-12" />
            </Button>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold text-white text-lg">
            {title}
          </div>

          {showDashboardButton && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <Button 
                variant="outline"
                size="sm" 
                className="absolute bg-slate-700 right-0 top-1/2 -translate-y-1/2 border-slate-600 hover:bg-slate-600 text-slate-200 cursor-pointer" 
                onClick={() => router.push(`/dashboard`)}
              >
                <span className="hidden md:inline">Dashboard</span>
                <Home className="h-4 w-4 md:hidden" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <ProgressBar
        current={currentQuestionIndex + 1}
        total={visibleQuestions.length}
      />

      {/* Question Content */}
      <div className="flex-grow flex flex-col items-center text-center px-4">
        <h2 className="text-2xl font-semibold text-white mb-12 max-w-5xl">
          {currentQuestion.text}
        </h2>
        {renderInput}
      </div>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto px-4 bg-slate-950 border-t border-slate-800 z-10">
        {currentQuestion.type === 'number' && (
          <Button
            onClick={goToNext}
            className={cn(
              'w-full py-3.5 text-base rounded-sm mb-4',
              isLastQuestion ? 'text-[#FFFFFF] bg-cyan-500 hover:bg-[#008C96]' : 'text-slate-900 bg-white hover:bg-slate-200',
            )}
            disabled={
              currentValue === undefined || currentValue === null || currentValue === ''
            }
          >
            {isLastQuestion ? subtitle : 'Tiếp tục'}
          </Button>
        )}
        {currentQuestion.type === 'options' && isLastQuestion && (
          <Button
            onClick={() => onSubmit(formData)}
            className="w-full bg-cyan-500 text-white hover:bg-[#008C96] mb-4 py-3.5 text-base rounded-sm"
            disabled={Object.keys(formData).length < visibleQuestions.length}
          >
            {subtitle}
          </Button>
        )}
      </div>
    </div>
  );
}
