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
    key: "yearToPurchase",
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
    key: "targetHousePriceN0",
    text: "Ngôi nhà mơ ước của bạn hiện tại đang có giá bao nhiêu?",
    type: "number",
    unit: "triệu VNĐ",
  },
  {
    key: "targetHouseType",
    text: "Căn nhà đó là loại nhà gì?",
    type: "options",
    options: [
      { label: "Chung cư", value: "Chung cư" },
      { label: "Nhà mặt đất", value: "Nhà mặt đất" },
      { label: "Khác", value: "Khác" },
    ],
  },
  {
    key: "targetLocation",
    text: "Bạn dự định sẽ mua nhà ở tỉnh/thành phố nào?",
    type: "options",
    options: [
      { label: "Hà Nội", value: "Hà Nội" },
      { label: "TP. Hồ Chí Minh", value: "TP. Hồ Chí Minh" },  
      { label: "Tỉnh/Thành phố khác", value: "Tỉnh/Thành phố khác" },
    ],
  },
  {
    key: "initialSavings",
    text: "Bạn đã tích lũy được bao nhiêu tiền để mua nhà rồi?",
    type: "number",
    unit: "triệu VNĐ",
  },
  {
    key: "userMonthlyIncome",
    text: "Lương hàng tháng của CÁ NHÂN BẠN là bao nhiêu?",
    type: "number",
    unit: "triệu VNĐ",
  },
  {
    key: "monthlyLivingExpenses",
    text: "Chi phí hàng tháng của CÁ NHÂN BẠN là bao nhiêu?",
    type: "number",
    unit: "triệu VNĐ",
  },
];

interface QuickCheckProps {
  quickCheck?: OnboardingPlanState;
  initialData?: OnboardingPlanState;
  planId?: string;
  onCompleted: (data: Partial<OnboardingPlanState>) => void;
}

export default function QuickCheck({ onCompleted, initialData }: QuickCheckProps) {
  const [step, setStep] = useState<"intro" | "form">("intro");

  const handleStart = () => setStep("form");

  const handleSubmit = (formData: Partial<OnboardingPlanState>) => {
    // Convert units from triệu VNĐ to VNĐ and pass to the parent component
    const processedData: Partial<OnboardingPlanState> = {
      ...formData,
      targetHousePriceN0: (formData.targetHousePriceN0 || 0),
      initialSavings: (formData.initialSavings || 0),
      userMonthlyIncome: (formData.userMonthlyIncome || 0),
      monthlyLivingExpenses:
        (formData.monthlyLivingExpenses || 0),
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
            className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-sm shadow-lg transition-transform transform active:scale-95"
          >
            Bắt đầu ngay
          </Button>
        </div>
      </>
    );
  }

  if (step === "form") {
    // Sử dụng dữ liệu từ initialData nếu có, nếu không thì mặc định là 0
    const defaultQuickCheckValues: Partial<OnboardingPlanState> = {
      // Sửa các key cho khớp với schema của Prisma
      targetHousePriceN0: initialData?.targetHousePriceN0 ?? 0,
      initialSavings: initialData?.initialSavings ?? 0,
      userMonthlyIncome: initialData?.userMonthlyIncome ?? 0,
      monthlyLivingExpenses: initialData?.monthlyLivingExpenses ?? 0,
      // Tính toán lại năm mua nhà để hiển thị trên form
      yearToPurchase: initialData?.yearToPurchase 
        ? new Date().getFullYear() + initialData.yearToPurchase 
        : new Date().getFullYear() + 5, // Mặc định 5 năm tới
    };
    return (
      <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-slate-950">
        <MultiStepQuestionForm
          questions={quickCheckQuestions}
          onSubmit={handleSubmit}
          title="Kiểm tra"
          subtitle="Tôi có mua được nhà không?"
          defaultValues={defaultQuickCheckValues}
        />
      </div>
    );
  }

  return null;
}