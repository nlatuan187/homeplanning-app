"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { OnboardingPlanState } from "../types";
import MultiStepQuestionForm, {
  Question,
} from "../shared/MultiStepQuestionForm";
import { CheckCircle, XCircle } from "lucide-react";

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
        <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col p-4 text-white z-10">
          <div className="flex flex-col items-center text-center pt-7">
            <h1 className="text-3xl font-bold mb-2">
              Chào mừng bạn đến với Finful
            </h1>
            <p className="text-lg text-white/90 mb-8 italic">
              Người đồng hành cùng bạn mua nhà
            </p>
            <Image
              src="/icons/suitcase 1.png"
              alt="Kiểm tra khả năng mua nhà"
              width={150}
              height={150}
              className="mb-6"
            />
            <div className="space-y-4 w-full text-left">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-2 flex items-center">
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">
                      Chúng tôi có thể
                    </h3>
                    <CheckCircle className="max-md:w-4 max-md:h-4 w-6 h-6 flex-shrink-0" />
                  </div>
                  <p className="text-lg max-md:text-xs text-white/80">
                    Tính toán và chỉ ra tất cả các con đường giúp bạn mua được
                    nhà, từ tiết kiệm đến đầu tư, vay vốn.
                  </p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-2 flex items-center">
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">
                      Chúng tôi không thể
                    </h3>
                    <XCircle className="max-md:w-4 max-md:h-4 w-6 h-6 flex-shrink-0" />
                  </div>
                  <p className="text-lg max-md:text-xs text-white/80">
                    Quyết định thay bạn. Chúng tôi chỉ nhận nhu cầu, tình hình
                    và để bạn tự chọn con đường phù hợp.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="fixed bottom-0 left-0 right-0 z-20">
            <div className="max-w-5xl mx-auto p-4">
              <div className="space-y-3">
                <Button
                  onClick={handleStart}
                  className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-lg transition-transform transform active:scale-95"
                >
                  Bắt đầu ngay
                </Button>
                <Button
                  onClick={() =>
                    window.open(
                      "https://cal.com/tuan-nguyen-finful/45min",
                      "_blank",
                    )
                  }
                  className="w-full bg-transparent border border-white/50 cursor-pointer text-white hover:bg-white/10 py-4 text-lg font-semibold rounded-lg shadow-lg transition-transform transform active:scale-95"
                >
                  Trò chuyện với chuyên gia trước
                </Button>
              </div>
            </div>
          </div>
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