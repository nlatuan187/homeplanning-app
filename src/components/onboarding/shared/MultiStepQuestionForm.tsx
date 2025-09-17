"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { OnboardingPlanState } from "../types";
import ProgressBar from "./ProgressBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeftIcon, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// Define the structure for a single question
export interface Question {
  key: keyof OnboardingPlanState;
  text: string | ((answers: Partial<OnboardingPlanState>) => string);
  type: "options" | "number";
  description?: string;
  options?: { label: string; value: any }[];
  unit?: string;
  condition?: (answers: Partial<OnboardingPlanState>) => boolean;
}

interface MultiStepQuestionFormProps {
  questions: Question[];
  onSubmit: (data: Partial<OnboardingPlanState>) => void;
  title: string;
  subtitle: string;
  defaultValues?: Partial<OnboardingPlanState>;
  description?: string;
  onDataChange?: (state: {
    formData: Partial<OnboardingPlanState>;
    touchedFields: Record<string, boolean>;
  }) => void;
  onBackFromFirst?: () => void;
  onStepChange?: (currentStep: number, totalSteps: number) => void;
  showProgressBar?: boolean;
  progressCurrent?: number;
  progressTotal?: number;
  initialQuestionIndex?: number;
  isFinalForm?: boolean;
  autoSubmitOnLastOption?: boolean;
}

export default function MultiStepQuestionForm({
  questions,
  onSubmit,
  title,
  subtitle,
  defaultValues = {}, // Gán giá trị mặc định là object rỗng
  onDataChange,
  onBackFromFirst,
  onStepChange,
  showProgressBar = true,
  progressCurrent,
  progressTotal,
  initialQuestionIndex,
  isFinalForm = false,
  autoSubmitOnLastOption = false,
}: MultiStepQuestionFormProps) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    initialQuestionIndex ?? 0,
  );
  // Khởi tạo formData với giá trị từ defaultValues
  const [formData, setFormData] =
    useState<Partial<OnboardingPlanState>>(defaultValues);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({}); // State mới

  // Đồng bộ hóa state của component cha một cách an toàn
  // Effect này sẽ chạy sau khi component con đã render xong
  useEffect(() => {
    onDataChange?.({ formData, touchedFields });
  }, [formData, touchedFields, onDataChange]);

  const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "";
    // Giữ nguyên giá trị số, không format để hiển thị được số thập phân khi nhập
    return value.toString();
  };

  const parseNumber = (value: string) => {
    // Cho phép dấu chấm và loại bỏ các ký tự không phải số khác (như dấu phẩy)
    const sanitizedValue = value.replace(/[^0-9.]/g, '');
    // Sử dụng parseFloat để xử lý số thập phân
    const parsed = parseFloat(sanitizedValue);
    // Trả về NaN nếu không hợp lệ để có thể xử lý ô input rỗng
    return isNaN(parsed) ? null : parsed;
  };

  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => !q.condition || q.condition(formData));
  }, [questions, formData]);

  useEffect(() => {
    onStepChange?.(currentQuestionIndex, visibleQuestions.length);
  }, [currentQuestionIndex, visibleQuestions, onStepChange]);

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

  const handleOptionClick = (value: any) => {
    const newFormData = { ...formData, [currentQuestion.key]: value };
    setFormData(newFormData);
    if (!touchedFields[currentQuestion.key]) {
      setTouchedFields((prev) => ({ ...prev, [currentQuestion.key]: true }));
    }

    // Re-calculate the list of visible questions based on the new data
    const newVisibleQuestions = questions.filter(
      (q) => !q.condition || q.condition(newFormData),
    );
    const newCurrentQuestionIndex = newVisibleQuestions.findIndex(
      (q) => q.key === currentQuestion.key,
    );

    // Check if the current question is still not the last one in the NEW list
    if (
      newCurrentQuestionIndex !== -1 &&
      newCurrentQuestionIndex < newVisibleQuestions.length - 1
    ) {
      setTimeout(() => {
        setCurrentQuestionIndex((prev) => prev + 1);
      }, 150);
    } else if (autoSubmitOnLastOption) {
      setTimeout(() => {
        onSubmit?.(newFormData);
      }, 150);
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
              onClick={() => handleOptionClick(option.value)}
              className={`w-full py-6 text-base justify-start pl-4 transition-all duration-200 ${currentValue === option.value ? 'text-slate-900 bg-white hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white'}`}
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

      return (
        <div className="relative w-full">
          <Input
            type="text"
            inputMode="decimal"
            value={currentValue !== undefined && currentValue !== null ? formatNumber(currentValue as number) : ''}
            onChange={(e) => handleInputChange(parseNumber(e.target.value))}
            className="w-full bg-slate-800 border-slate-600 text-white h-14 text-lg pl-4 pr-24"
            placeholder={
              defaultValue === undefined || defaultValue === null
                ? "Nhập câu trả lời...."
                : formatNumber(defaultValue as number)
            }
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

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (onBackFromFirst) {
      onBackFromFirst();
    }
  };

  const handleNext = async () => {
    if (currentQuestionIndex < visibleQuestionsRef.current.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      onSubmit?.(formData);
    }
  };

  return (
    <div className="flex flex-col h-full flex-grow w-full">
      {/* Header Section */}
      <div>
        {/* Navigation: Uses absolute positioning for perfect centering */}
        <div className="relative flex items-center h-10 mb-4 mx-2">
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              disabled={currentQuestionIndex === 0 && !onBackFromFirst}
            >
              <ArrowLeftIcon className="h-12 w-12" />
            </Button>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold text-white text-lg">
            {title}
          </div>
        </div>
      </div>

      {showProgressBar && (
        <div className="">
          <ProgressBar
            current={
              progressCurrent !== undefined
                ? progressCurrent
                : currentQuestionIndex + 1
            }
            total={
              progressTotal !== undefined
                ? progressTotal
                : visibleQuestions.length
            }
          />
        </div>
      )}

      {
        currentQuestion.description && (
          <div className="text-sm text-gray-500 max-md:text-left text-center mt-2 px-4">
            {currentQuestion.description}
          </div>
        )
      }

      {/* Question Content */}
      <div className="flex-grow flex flex-col pt-5 items-center text-center px-4">
        <h2 className="text-2xl font-semibold text-white mb-12 max-w-5xl">
          {typeof currentQuestion.text === 'function'
            ? currentQuestion.text(formData)
            : currentQuestion.text}
        </h2>
        {renderInput}
      </div>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto px-4 bg-slate-950 border-t border-slate-800 z-10">
        {currentQuestion.type === 'number' && (
          <Button
            onClick={handleNext}
            className={cn(
              'w-full py-3.5 text-base rounded-sm mb-4',
              isLastQuestion && isFinalForm
                ? 'text-[#FFFFFF] bg-cyan-500 hover:bg-[#008C96]'
                : 'text-slate-900 bg-white hover:bg-slate-200',
            )}
            disabled={
              currentValue === undefined || currentValue === null || currentValue === ''
            }
          >
            {isLastQuestion ? subtitle : 'Tiếp tục'}
          </Button>
        )}
        {currentQuestion.type === "options" &&
          isLastQuestion &&
          !autoSubmitOnLastOption && (
            <Button
              onClick={() => onSubmit?.(formData)}
              className={cn(
              "w-full mb-4 py-3.5 text-base rounded-sm",
              isFinalForm
                ? "bg-cyan-500 text-white hover:bg-[#008C96]"
                : "bg-white text-slate-900 hover:bg-slate-200",
            )}
            disabled={currentValue === undefined}
          >
            {isFinalForm ? subtitle : "Tiếp tục"}
          </Button>
        )}
      </div>
    </div>
  );
}
