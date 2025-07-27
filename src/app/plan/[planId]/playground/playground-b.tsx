"use client"; // Required for useState and client-side interactions
import { ArrowLeft, Edit3 } from "lucide-react";
import { useState } from 'react';
import React from 'react';
import { Button } from "@/components/ui/button";
import { ProjectionRow } from "@/lib/calculations/affordability";
import AccumulationChart from "@/components/plan/playground/AccumulationChart";
import FinancialSliders from "@/components/plan/playground/FinancialSliders";
import { Plan } from "@prisma/client";

interface PlaygroundBProps {
  plan: Plan;
  targetYear: number;
  projection: ProjectionRow;
  projectionData: ProjectionRow[];
  planLoanInterestRate: number;
  planLoanTermYears: number; 
}

// Remove the static data array and generate it dynamically based on projectionData and the current date
type Milestone = {
  name: string;
  tietKiem: number;
  hangThang: number;
  tong: number;
};

function generateMilestones(
  projectionData: ProjectionRow[],
  targetYear: number,
  plan: Plan
): Milestone[] {
  const milestones: Milestone[] = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  const purchaseMonth = plan.createdAt ? new Date(plan.createdAt).getMonth() + 1 : 12;

  // Find the first milestone (either next June or December)
  let nextMilestoneMonth = month <= 6 ? 6 : 12;
  if (month > 12) {
    year++;
    nextMilestoneMonth = 6;
  }

  // Start with initial savings
  let currentTietKiem = Math.round(plan.initialSavings);

  // Loop until we reach the targetYear and the milestone month >= purchaseMonth
  while (
    year < targetYear || (year === targetYear && nextMilestoneMonth <= purchaseMonth)
  ) {
    // Find the closest projection row for this year
    const proj = projectionData.find((p) => p.year === year);
    console.log("plan", plan)
    // Monthly savings = buffer from projection
    const hangThang = proj ? Math.round(plan.buffer || 0) : 0;
    // Add 6 months of monthly savings to current tiết kiệm
    currentTietKiem += hangThang * 6;
    // Total = current tiết kiệm + monthly savings
    const tong = currentTietKiem + hangThang;
    milestones.push({
      name: `${nextMilestoneMonth.toString().padStart(2, '0')}/${year}`,
      tietKiem: currentTietKiem,
      hangThang,
      tong,
    });
    // Move to next milestone
    if (nextMilestoneMonth === 6) {
      nextMilestoneMonth = 12;
    } else {
      nextMilestoneMonth = 6;
      year++;
    }
  }
  return milestones;
}

export default function PlaygroundB({
  plan,
  targetYear,
  projection,
  projectionData,
  planLoanInterestRate,
  planLoanTermYears
}: PlaygroundBProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEmergencyFundWarning, setShowEmergencyFundWarning] = useState(false);
  const [showEmergencyInsuranceWarning, setShowEmergencyInsuranceWarning] = useState(false);
  const [salaryGrowth, setSalaryGrowth] = useState(projection.pctSalaryGrowth);
  const [investmentReturn, setInvestmentReturn] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [extraIncome, setExtraIncome] = useState(0);
  const [hasEmergencyFund, setHasEmergencyFund] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(true);

  const monthPurchase = plan?.createdAt ? new Date(plan.createdAt).getMonth() + 1 : '';
  const displayYear = targetYear;

  const tiLeTienCanVay = projection.housePriceProjected > 0 ? Math.round((projection.loanAmountNeeded / projection.housePriceProjected) * 100) : 0;
  const soTienCanVay = Math.round((projection.housePriceProjected * tiLeTienCanVay / 100) / 1000)

  const emergencyFund = (plan.monthlyLivingExpenses + (plan.monthlyNonHousingDebt || 0)) * 6;
  const insurancePremium = plan?.currentAnnualInsurancePremium || 0;

  console.log(plan)

  const handleContinue = () => {
    setShowConfirmModal(true);
  };

  // Replace static data with dynamic milestones
  const data = generateMilestones(projectionData, targetYear, plan);
  console.log("data", data)

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 mb-8">
      <header className="container mx-auto max-w-5xl px-4 pt-8 py-6 flex justify-between items-center sticky top-0 bg-slate-950 z-40 border-b border-slate-800"> {/* Increased py-4 to py-6 */}
        <button><ArrowLeft className="ml-2 h-5 w-5" /></button>
        <div className="flex flex-col items-center">
          <div className="text-2xl font-bold text-green-500">Mục tiêu khả thi</div>
          <div className="text-[14px] text-gray-400">Mua nhà vào {monthPurchase.toLocaleString('en-US', { minimumIntegerDigits: 2 })}/{displayYear} với giá {Math.round(projection.housePriceProjected).toLocaleString()}</div> {/* Increased text-xl to text-2xl */}
        </div>
        <Edit3 />
      </header>

      <div className="container mx-auto px-4 pb-2 pt-6 flex flex-row gap-4">
        <div className="bg-white text-black rounded-lg shadow px-6 py-4 flex-1 flex flex-col justify-center">
          <h2 className="text-lg font-semibold whitespace-nowrap text-center">
            {soTienCanVay} tỷ ~ {tiLeTienCanVay}%
          </h2>
          <p className="text-sm text-center mt-1">Số tiền cần vay & Tỷ lệ vay</p>
        </div>
        <div className="bg-white text-black rounded-lg shadow px-6 py-4 flex-1 flex flex-col justify-center">
          <h2 className="text-lg font-semibold whitespace-nowrap text-center">
            {Math.round(projection.buffer).toLocaleString()} triệu/tháng
          </h2>
          <p className="text-sm text-center mt-1">Khoản dư sau khi trả nợ</p>
        </div>
      </div>
 
      <div className="container mx-auto max-w-5xl px-4 py-2">
        <AccumulationChart data={data} />
        <FinancialSliders
          items={[
            {
              label: "Tăng lương (năm):",
              value: salaryGrowth,
              setValue: setSalaryGrowth,
              suffix: "%",
              max: 100,
            },
            {
              label: "Lợi nhuận đầu tư (năm):",
              value: investmentReturn,
              setValue: setInvestmentReturn,
              suffix: "%",
              max: 100,
            },
            {
              label: "Chi tiêu (tháng):",
              value: monthlyExpense,
              setValue: setMonthlyExpense,
              suffix: "tr",
              max: 50,
            },
            {
              label: "Thu nhập thêm (tháng):",
              value: extraIncome,
              setValue: setExtraIncome,
              suffix: "tr",
              max: 50,
            },
          ]}
        />
      </div>

      {/* --- SWITCHES --- */}
      <div className="container mx-auto my-3 max-w-5xl px-4 pt-2 text-sm text-white border-t border-gray-600">
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Quỹ dự phòng */}
          <label className="text-left">Quỹ dự phòng:</label>
          <div className="text-left">{emergencyFund} triệu (6 tháng chi tiêu)</div>
          <div className="flex justify-end">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hasEmergencyFund}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (!checked) {
                    setShowEmergencyFundWarning(true);
                  }
                  setHasEmergencyFund(checked);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-400 rounded-full peer peer-checked:bg-cyan-500 transition-all" />
              <div className="absolute w-4 h-4 bg-white rounded-full left-1 top-1 peer-checked:translate-x-5 transition-all" />
            </label>
          </div>

          {/* Bảo hiểm nhân thọ */}
          <label className="text-left">Bảo hiểm nhân thọ:</label>
          <div className="text-left">{insurancePremium.toLocaleString()} triệu/năm</div>
          <div className="flex justify-end">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hasInsurance}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (!checked) {
                    setShowEmergencyInsuranceWarning(true);
                  }
                  setHasInsurance(e.target.checked);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-400 rounded-full peer peer-checked:bg-cyan-500 transition-all" />
              <div className="absolute w-4 h-4 bg-white rounded-full left-1 top-1 peer-checked:translate-x-5 transition-all" />
            </label>
          </div>
        </div>
      </div>

      <div className="container mx-auto my-3 max-w-5xl px-4 pt-2 flex justify-between">
        <Button type="button">Reset giả định ban đầu</Button>
        <Button type="button" variant="outline" onClick={handleContinue}>Tiếp tục</Button>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-center shadow-xl relative">
            
            {/* Nút X đóng */}
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              onClick={() => setShowConfirmModal(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-lg font-bold mb-2 text-black">XÁC NHẬN GIẢ ĐỊNH</h2>

            <div className="flex justify-center mb-4">
              <div className="bg-green-500 rounded-full p-2">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-6">
              Kế hoạch hành động sẽ được thiết kế dựa trên những con số bạn chốt. Bạn sẽ không thể thay đổi giả định lần nữa, vì vậy hãy kiểm tra kỹ trước khi tiếp tục nhé!
            </p>

            <button
              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 text-sm font-semibold"
              onClick={() => {
                setShowConfirmModal(false);
                // TODO: thực hiện logic tiếp theo
              }}
            >
              Chốt và thiết kế kế hoạch hành động
            </button>
          </div>
        </div>
      )}

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
