
"use client";

import { ArrowLeft, Edit3 } from "lucide-react";
import { useState } from 'react';
import { Plan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ProjectionRow } from "@/lib/calculations/affordability";
import AccumulationChart from "@/components/plan/playground/AccumulationChart";
import FinancialSliders from "@/components/plan/playground/FinancialSliders";

interface PlaygroundAProps {
  plan: Plan;
  targetYear: number; // This is the user's original target year from the plan
  projection: ProjectionRow; // This is the projection for the targetYear
  firstViableYear: number | null;
  projectionData: ProjectionRow[];
  planLoanInterestRate: number;
  planLoanTermYears: number; 
}

const data = [
  { name: 'Hiện tại', tietKiem: 520, hangThang: 100, tong: 520 },
  { name: '12/2025', tietKiem: 700, hangThang: 180, tong: 800 },
  { name: '6/2026', tietKiem: 750, hangThang: 250, tong: 900 },
  { name: '12/2026', tietKiem: 780, hangThang: 320, tong: 980 },
];

export default function PlaygroundA({
  plan,
  targetYear,
  projection, // projection for the targetYear
  firstViableYear,
  projectionData,
  planLoanInterestRate,
  planLoanTermYears
}: PlaygroundAProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEmergencyFundWarning, setShowEmergencyFundWarning] = useState(false);
  const [showEmergencyInsuranceWarning, setShowEmergencyInsuranceWarning] = useState(false);
  const [salaryGrowth, setSalaryGrowth] = useState(7);
  const [investmentReturn, setInvestmentReturn] = useState(9);
  const [monthlyExpense, setMonthlyExpense] = useState(20);
  const [extraIncome, setExtraIncome] = useState(15);
  const [hasEmergencyFund, setHasEmergencyFund] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(true);

  const monthPurchase = plan?.createdAt ? new Date(plan.createdAt).getMonth() + 1 : '';
  const displayYear = targetYear;

  const handleContinue = () => {
    setShowConfirmModal(true);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 mb-8">
      <header className="relative px-4 pt-8 pb-4 bg-slate-950 border-b border-slate-800">
        <button className="absolute left-4 top-8 text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="text-lg sm:text-2xl font-bold text-red-500">Mục tiêu không khả thi</div>
          <div className="text-xs sm:text-sm text-gray-400">Mua nhà vào {monthPurchase.toLocaleString('en-US', { minimumIntegerDigits: 2 })}/{displayYear} với giá.....</div>
        </div>
        <button className="absolute right-4 top-8 text-white">
          <Edit3 className="h-5 w-5" />
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="w-full h-[140px] sm:h-[180px] bg-white text-black rounded-xl shadow flex flex-col items-center justify-center text-center px-4">
          <h2 className="text-2xl sm:text-3xl font-bold">500 triệu</h2>
          <p className="text-sm sm:text-xl text-black mt-1">Số tiền bạn đang thiếu</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6 pb-4">
        <AccumulationChart data={data} />
        <FinancialSliders
          items={[
            { label: "Tăng lương (năm):", value: salaryGrowth, setValue: setSalaryGrowth, suffix: "%", max: 20 },
            { label: "Lợi nhuận đầu tư (năm):", value: investmentReturn, setValue: setInvestmentReturn, suffix: "%", max: 20 },
            { label: "Chi tiêu (tháng):", value: monthlyExpense, setValue: setMonthlyExpense, suffix: "tr", max: 50 },
            { label: "Thu nhập thêm (tháng):", value: extraIncome, setValue: setExtraIncome, suffix: "tr", max: 50 },
          ]}
        />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-2 space-y-3 text-sm px-4 border-t border-gray-600">
        {/* Dòng: Quỹ dự phòng */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="w-1/3 whitespace-nowrap text-white">Quỹ dự phòng:</div>
          <div className="flex-1 text-left">... triệu (6 tháng chi tiêu)</div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={hasEmergencyFund}
              onChange={(e) => {
                const checked = e.target.checked;
                if (!checked) setShowEmergencyFundWarning(true);
                setHasEmergencyFund(checked);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-cyan-500 transition-all" />
            <div className="absolute w-4 h-4 bg-white rounded-full left-1 top-1 peer-checked:translate-x-5 transition-all" />
          </label>
        </div>

        {/* Dòng: Bảo hiểm nhân thọ */}
        <div className="flex items-center justify-between gap-4">
          <div className="w-1/3 whitespace-nowrap text-white">Bảo hiểm nhân thọ:</div>
          <div className="flex-1 text-left">... triệu/năm</div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={hasInsurance}
              onChange={(e) => {
                const checked = e.target.checked;
                if (!checked) setShowEmergencyInsuranceWarning(true);
                setHasInsurance(checked);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-cyan-500 transition-all" />
            <div className="absolute w-4 h-4 bg-white rounded-full left-1 top-1 peer-checked:translate-x-5 transition-all" />
          </label>
        </div>
      </div>

      <div className="max-w-5xl mx-auto my-6 px-4 flex flex-col justify-between gap-4">
        <Button type="button">Reset giả định ban đầu</Button>
        <Button type="button" variant="outline" onClick={handleContinue}>Thay đổi toàn bộ kế hoạch</Button>
      </div>

      {showEmergencyFundWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-center shadow-xl relative">
            {/* Nút đóng */}
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowEmergencyFundWarning(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Tiêu đề */}
            <h2 className="text-lg font-bold mb-1 text-red-600 uppercase">Hãy cẩn thận!</h2>
            <p className="text-gray-800 font-semibold mb-4">Bạn không muốn xây dựng quỹ dự phòng sao?</p>

            {/* Icon cảnh báo */}
            <div className="flex justify-center mb-4">
              <div className="bg-transparent p-2">
                <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 0 1 .894.553l7 14A1 1 0 0 1 17 18H3a1 1 0 0 1-.894-1.447l7-14A1 1 0 0 1 10 2zm0 4a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0V7a1 1 0 0 0-1-1zm0 8a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 10 14z" />
                </svg>
              </div>
            </div>

            {/* Nội dung */}
            <p className="text-sm text-gray-700">
              Nếu không có quỹ dự phòng, chỉ cần một lần ốm nặng, mất việc hay tai nạn nhỏ cũng đủ khiến tài chính của bạn chao đảo.
              Bạn sẽ phải vay mượn, bán tài sản hoặc chi tiêu cắt xén, sống trong áp lực và thiếu kiểm soát.
              Không có lớp đệm an toàn, kế hoạch mua nhà có thể đổ vỡ chỉ vì một rủi ro bất ngờ.
            </p>
          </div>
        </div>
      )}

      {showEmergencyInsuranceWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-center shadow-xl relative">
            {/* Nút đóng */}
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowEmergencyInsuranceWarning(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Tiêu đề */}
            <h2 className="text-lg font-bold mb-1 text-red-600 uppercase">Hãy cẩn thận!</h2>
            <p className="text-gray-800 font-semibold mb-4">Bạn không muốn trang bị bảo hiểm nhân thọ sao?</p>

            {/* Icon cảnh báo */}
            <div className="flex justify-center mb-4">
              <div className="bg-transparent p-2">
                <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 0 1 .894.553l7 14A1 1 0 0 1 17 18H3a1 1 0 0 1-.894-1.447l7-14A1 1 0 0 1 10 2zm0 4a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0V7a1 1 0 0 0-1-1zm0 8a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 10 14z" />
                </svg>
              </div>
            </div>

            {/* Nội dung */}
            <p className="text-sm text-gray-700">
              Không phải ai cũng nghĩ tới bảo hiểm nhân thọ vì chẳng ai muốn nghĩ đến rủi ro. Thật ra,
              nó giống như một lời dặn dò âm thầm: "Nếu có chuyện gì, mình đã chuẩn bị cho các bạn rồi."
              Không phải để lo sợ, mà để những người mình thương không phải xoay sở trong lúc khó khăn
              nhất. Đôi khi, lo xa một chút không phải vì mình, mà là vì người thân yêu của mình.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
