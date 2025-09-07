"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { OnboardingPlanState } from "../types";
import MultiStepQuestionForm, {
  Question,
} from "../shared/MultiStepQuestionForm";

const currentYear = new Date().getFullYear();

// Define the 7 questions for the Quick Check section
const quickCheckQuestions: Question[] = [
  {
    key: "purchaseYear",
    text: "Bạn dự định mua nhà vào thời điểm nào?",
    type: "options",
    options: [
      { label: `Bây giờ (${currentYear})`, value: currentYear },
      { label: `1 năm nữa (${currentYear + 1})`, value: currentYear + 1 },
      { label: `2 năm nữa (${currentYear + 2})`, value: currentYear + 2 },
      { label: `3 năm nữa (${currentYear + 3})`, value: currentYear + 3 },
    ],
  },
  {
    key: "propertyValue",
    text: "Ngôi nhà mơ ước của bạn hiện tại đang có giá bao nhiêu?",
    type: "number",
    unit: "triệu VNĐ",
  },
  {
    key: "propertyType",
    text: "Căn nhà đó là loại nhà gì?",
    type: "options",
    options: [
      { label: "Chung cư", value: "APARTMENT" },
      { label: "Nhà mặt đất", value: "LANDED_HOUSE" },
      { label: "Khác", value: "OTHER" },
    ],
  },
  {
    key: "city",
    text: "Bạn dự định sẽ mua nhà ở tỉnh/thành phố nào?",
    type: "options",
    options: [
      { label: "Hà Nội", value: "Hanoi" },
      { label: "TP. Hồ Chí Minh", value: "HCMC" },  
      { label: "Tỉnh/Thành phố khác", value: "Other" },
    ],
  },
  {
    key: "initialSavings",
    text: "Bạn đã tích lũy được bao nhiêu tiền để mua nhà rồi?",
    type: "number",
    unit: "triệu VNĐ",
  },
  {
    key: "personalMonthlyIncome",
    text: "Lương hàng tháng của CÁ NHÂN BẠN là bao nhiêu?",
    type: "number",
    unit: "triệu VNĐ",
  },
  {
    key: "personalMonthlyExpenses",
    text: "Chi phí hàng tháng của CÁ NHÂN BẠN là bao nhiêu?",
    type: "number",
    unit: "triệu VNĐ",
  },
];

interface QuickCheckProps {
  onCompleted: (data: Partial<OnboardingPlanState>) => void;
}

export default function QuickCheck({ onCompleted }: QuickCheckProps) {
  const [step, setStep] = useState<"intro" | "form">("intro");

  const handleStart = () => setStep("form");

  const handleSubmit = (formData: Partial<OnboardingPlanState>) => {
    // Convert units from triệu VNĐ to VNĐ and pass to the parent component
    const processedData: Partial<OnboardingPlanState> = {
      ...formData,
      propertyValue: (formData.propertyValue || 0),
      initialSavings: (formData.initialSavings || 0),
      personalMonthlyIncome: (formData.personalMonthlyIncome || 0),
      personalMonthlyExpenses:
        (formData.personalMonthlyExpenses || 0),
    };

    onCompleted(processedData);
  };

  if (step === "intro") {
    return (
      <>
        {/* Background Gradient */}
        <div
          className="max-w-5xl mx-auto fixed inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: "url('/onboarding/section1bg.png')" }}
        />
        {/* Content */}
        <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col p-8 z-10">
          <div className="flex-grow flex flex-col items-center justify-center text-center">
            <Image
              src="/icons/suitcase 1.png"
              alt="Kiểm tra khả năng mua nhà"
              width={80}
              height={80}
              className="mb-6"
            />
            <h1 className="text-4xl max-md:text-3xl font-bold text-white mb-3">
              Kiểm tra
              <br />
              khả năng mua nhà
            </h1>
            <p className="text-lg text-white/90 max-w-sm">
              Chỉ trong 1 phút, bạn sẽ biết mình có thể mua được căn nhà mơ ước
              hay không?
            </p>
          </div>
          <Button
            onClick={handleStart}
            className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-xl shadow-lg transition-transform transform active:scale-95"
          >
            Bắt đầu ngay
          </Button>
        </div>
      </>
    );
  }

  if (step === "form") {
    return (
      <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col p-8 z-10 bg-slate-950">
        <MultiStepQuestionForm
          questions={quickCheckQuestions}
          onSubmit={handleSubmit}
          title="Kiểm tra"
          subtitle="Tôi có mua được nhà không?"
        />
      </div>
    );
  }

  return null;
}