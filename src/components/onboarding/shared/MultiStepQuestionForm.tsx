"use client";

import { useState, useMemo } from 'react';
import { OnboardingPlanState } from '../types';
import ProgressBar from './ProgressBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, HomeIcon } from 'lucide-react';
import Link from "next/link";
import { cn } from '@/lib/utils';

// Define the structure for a single question
export interface Question {
  key: keyof OnboardingPlanState;
  text: string;
  type: 'options' | 'number';
  options?: { label: string; value: any }[];
  unit?: string;
}

interface MultiStepQuestionFormProps {
  questions: Question[];
  onSubmit: (data: Partial<OnboardingPlanState>) => void;
}

export default function MultiStepQuestionForm({ questions, onSubmit }: MultiStepQuestionFormProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [formData, setFormData] = useState<Partial<OnboardingPlanState>>({});

  const currentQuestion = questions[currentQuestionIndex];
  const currentValue = formData[currentQuestion.key];

  const handleInputChange = (value: any) => {
    setFormData(prev => ({ ...prev, [currentQuestion.key]: value }));
  };

  const handleOptionClick = (value: any) => {
    handleInputChange(value);
    // Auto-advance for option selection
    setTimeout(() => {
      goToNext();
    }, 150);
  };
  
  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Reached the end, submit the form
      onSubmit(formData);
    }
  };

  const goToPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Memoize input rendering to avoid re-renders
  const renderInput = useMemo(() => {
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
      return (
        <div className="relative w-full">
            <Input
              type="number"
              value={currentValue as number || ''}
              onChange={(e) => handleInputChange(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-800 border-slate-600 text-white h-14 text-lg pl-4 pr-24"
              placeholder="Nhập thông tin..."
            />
            {currentQuestion.unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{currentQuestion.unit}</span>}
        </div>
      );
    }
    
    return null;
  }, [currentQuestion, currentValue]);

  return (
    <div className="flex flex-col h-full flex-grow w-full">
      {/* Header Section */}
      <div className="mb-4">
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
            Kiểm tra
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          current={currentQuestionIndex + 1}
          total={questions.length}
        />
      </div>

      {/* Question Content */}
      <div className="flex-grow flex flex-col items-center text-center px-4">
        <h2 className="text-2xl font-semibold text-white mb-8 max-w-5xl">
          {currentQuestion.text}
        </h2>
        {renderInput}
      </div>

      {/* Action Button */}
      <div className="mt-auto px-4">
        {currentQuestion.type === 'number' && (
          <Button
            onClick={goToNext}
            className={cn(
              'w-full py-3.5 text-base rounded-sm mb-4',
              isLastQuestion ? 'text-[#FFFFFF] bg-[#00ACB8] hover:bg-[#008C96]' : 'text-slate-900 bg-white hover:bg-slate-200',
            )}
            disabled={
              currentValue === undefined || currentValue === null || currentValue === ''
            }
          >
            {isLastQuestion ? 'Tôi có mua được nhà không?' : 'Tiếp tục'}
          </Button>
        )}
        {/* For option type, the final button is implicitly handled by auto-advance */}
        {currentQuestion.type === 'options' && isLastQuestion && (
          <Button
            onClick={() => onSubmit(formData)}
            className="w-full bg-[#00ACB8] text-white hover:bg-[#008C96] py-3.5 text-base rounded-sm"
            disabled={Object.keys(formData).length < questions.length}
          >
            Tôi có mua được nhà không?
          </Button>
        )}
      </div>
    </div>
  );
}
