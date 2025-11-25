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
  const [inputValue, setInputValue] = useState<string>(""); // State mới để quản lý giá trị input dạng chuỗi
  const inputRef = useRef<HTMLInputElement>(null); // Ref để focus vào input

  // Đồng bộ hóa state của component cha một cách an toàn
  // Effect này sẽ chạy sau khi component con đã render xong
  useEffect(() => {
    onDataChange?.({ formData, touchedFields });
  }, [formData, touchedFields, onDataChange]);

  const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "";
    // Sử dụng toLocaleString để thêm dấu phẩy hàng nghìn
    return value.toLocaleString('en-US');
  };

  const parseNumber = (value: string) => {
    // Loại bỏ dấu phẩy hàng nghìn trước khi parse
    const sanitizedValue = value.replace(/,/g, '');
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

  useEffect(() => {
    // Cập nhật inputValue với giá trị đã format khi câu hỏi thay đổi
    if (currentQuestion?.type === 'number') {
      const value = formData[currentQuestion.key];
      setInputValue(value != null ? formatNumber(value as number) : '');
      // Auto-focus vào input khi chuyển đến câu hỏi type number
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [currentQuestion]);

  const visibleQuestionsRef = useRef(visibleQuestions);
  useEffect(() => {
    visibleQuestionsRef.current = visibleQuestions;
  }, [visibleQuestions]);


  const handleInputChange = (value: string) => {
    // 1. Chỉ giữ lại số và một dấu chấm thập phân
    const sanitized = value.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    const integerPart = parts[0];
    const fractionalPart = parts.length > 1 ? parts.slice(1).join("") : undefined;

    // Nếu có nhiều hơn 1 dấu chấm, không cập nhật
    if (parts.length > 2) {
      return;
    }

    // 2. Cập nhật giá trị số cho state của form
    const numericValue = parseFloat(`${integerPart}.${fractionalPart || ''}`);
    setFormData((prev) => ({
      ...prev,
      [currentQuestion.key]: isNaN(numericValue) ? null : numericValue,
    }));

    // 3. Tạo chuỗi hiển thị đã được định dạng
    const formattedInteger = integerPart ? parseInt(integerPart, 10).toLocaleString("en-US") : "0";

    let displayValue;
    if (fractionalPart !== undefined) {
      displayValue = `${formattedInteger}.${fractionalPart}`;
    } else if (value.endsWith(".") && integerPart) {
      displayValue = `${formattedInteger}.`;
    } else if (integerPart) {
      displayValue = formattedInteger;
    } else {
      displayValue = "";
    }

    setInputValue(displayValue);

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
              className={`w-full py-6 font-light text-regular justify-start pl-4 transition-all duration-200 ${currentValue === option.value ? 'text-white bg-[#292929] border hover:bg-[#292929] border-cyan-500' : 'bg-[#292929] text-white border border-slate-600 hover:bg-slate-800 hover:text-white'}`}
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
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                // Chỉ submit nếu có giá trị hợp lệ
                if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
                  handleNext();
                }
              }
            }}
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
  }, [currentQuestion, currentValue, defaultValues, inputValue]);

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
      <div className="flex-grow flex flex-col pt-10 items-start text-start px-4">
        <h2 className="text-xl font-regular text-white mb-12 max-w-5xl">
          {typeof currentQuestion.text === 'function'
            ? currentQuestion.text(formData)
            : currentQuestion.text}
        </h2>
        {renderInput}
      </div>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto px-4 bg-[#121212] border-t border-slate-800 z-10">
        {currentQuestion.type === 'number' && (
          <Button
            onClick={handleNext}
            className={cn(
              'w-full py-3.5 text-base rounded-sm mb-4',
              'text-[#292929] bg-white hover:bg-slate-200'
            )}
            disabled={
              currentValue === undefined || currentValue === null || currentValue === ''
            }
          >
            Tiếp tục
          </Button>
        )}
        {currentQuestion.type === "options" &&
          isLastQuestion &&
          !autoSubmitOnLastOption && (
            <Button
              onClick={() => onSubmit?.(formData)}
              className={cn(
                "w-full mb-4 py-3.5 text-base rounded-sm",
                "bg-white text-[#292929] hover:bg-slate-200",
              )}
              disabled={currentValue === undefined}
            >
              Tiếp tục
            </Button>
          )}
      </div>
    </div>
  );
}
