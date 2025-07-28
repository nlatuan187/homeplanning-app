"use client"; // Required for useState and client-side interactions
import { ArrowLeft, Edit3 } from "lucide-react";
import { useState } from 'react';
import { useRouter, useParams } from "next/navigation";
import React from 'react';
import { Button } from "@/components/ui/button";
import { ProjectionRow } from "@/lib/calculations/affordability";
import AccumulationChart from "@/components/plan/playground/AccumulationChart";
import FinancialSliders from "@/components/plan/playground/FinancialSliders";
import { Plan } from "@prisma/client";
import { updatePlaygroundValue } from "@/actions/updatePlayground"; // điều chỉnh path nếu khác
import { confirmPlaygroundAssumptions } from "@/actions/confirmPlaygroundAssumptions";

type InteractionLogEntry = {
  timestamp: string;
  type: 'interaction_start' | 'initial_change' | 'reset_to_initial' | 'final_submit';
  initialValues?: Record<string, any>;
};

interface PlaygroundBProps {
  plan: Plan;
  targetYear: number;
  projection: ProjectionRow;
  projectionData: ProjectionRow[];
  planLoanInterestRate: number;
  planLoanTermYears: number; 
}

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
  let month = now.getMonth() + 1;
  let year = now.getFullYear();

  const createdAtYear = plan.createdAt
    ? new Date(plan.createdAt).getFullYear()
    : year;

  const confirmedYear = plan.confirmedPurchaseYear || targetYear;
  const milestoneCount = (confirmedYear - createdAtYear) * 2 + 1;

  let currentSavings = plan.initialSavings;
  const annualReturn = plan.pctInvestmentReturn / 100;
  const monthlyRate = Math.pow(1 + annualReturn, 1 / 12); // a

  milestones.push({
    name: "Hiện tại",
    tietKiem: Math.round(currentSavings),
    hangThang: 0,
    tong: Math.round(currentSavings),
  });

  const S = projectionData.find(p => p.year === confirmedYear)?.buffer ?? 0;
  let total = 0;

  for (let i = 1; i < milestoneCount; i++) {
    let totalContribution = total + 0;

    for (let j = 0; j < 6; j++) {
      totalContribution += S
      totalContribution *= monthlyRate;
      total = totalContribution

      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    milestones.push({
      name: `${month.toString().padStart(2, "0")}/${year}`,
      tietKiem: Math.round(currentSavings * Math.pow(Math.pow(monthlyRate, 6), i)),
      hangThang: Math.round(totalContribution),
      tong: Math.round(currentSavings * Math.pow(Math.pow(monthlyRate, 6), i)) + Math.round(totalContribution),
    });
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
  const router = useRouter()
  const params = useParams()
  const planId = params.planId as string;

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEmergencyFundWarning, setShowEmergencyFundWarning] = useState(false);
  const [showEmergencyInsuranceWarning, setShowEmergencyInsuranceWarning] = useState(false);
  const [salaryGrowth, setSalaryGrowth] = useState(plan.pctSalaryGrowth);
  const [investmentReturn, setInvestmentReturn] = useState(plan.pctInvestmentReturn);
  const [monthlyExpense, setMonthlyExpense] = useState(plan.monthlyLivingExpenses);
  const [extraIncome, setExtraIncome] = useState(plan.monthlyOtherIncome);
  const [hasEmergencyFund, setHasEmergencyFund] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(true);

  const monthPurchase = plan.createdAt ? new Date(plan.createdAt).getMonth() + 1 : '';
  const confirmedYear = plan.confirmedPurchaseYear || targetYear;
  const housePriceProjected = projectionData.find(p => p.year === confirmedYear)?.housePriceProjected || plan.targetHousePriceN0;
  const buffer = projectionData.find(p => p.year === confirmedYear)?.buffer;

  const tiLeTienCanVay = projection.housePriceProjected > 0 ? Math.round((projection.loanAmountNeeded / projection.housePriceProjected) * 100) : 0;
  const soTienCanVay = Math.round((projection.housePriceProjected * tiLeTienCanVay / 100) / 1000)

  const emergencyFund = (plan.monthlyLivingExpenses + (plan.monthlyNonHousingDebt || 0)) * 6;
  const insurancePremium = plan?.currentAnnualInsurancePremium || 0;

  const handleContinue = () => {
    setShowConfirmModal(true);
  };

  const data = generateMilestones(projectionData, plan.confirmedPurchaseYear || targetYear, plan);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 mb-8">
      <header className="container mx-auto max-w-5xl px-4 pt-8 py-6 flex justify-between items-center sticky top-0 bg-slate-950 z-40 border-b border-slate-800"> {/* Increased py-4 to py-6 */}
        <button onClick={() => router.push(`/plan/${planId}/results`)}><ArrowLeft className="ml-2 h-5 w-5 text-slate-300 hover:text-white"/></button>
        <div className="flex flex-col items-center">
          <div className="text-2xl font-bold text-green-500">Mục tiêu khả thi</div>
          <div className="text-[14px] text-gray-400">Mua nhà vào {monthPurchase.toLocaleString('en-US', { minimumIntegerDigits: 2 })}/{plan.confirmedPurchaseYear} với giá {Math.round(housePriceProjected).toLocaleString()} triệu</div> {/* Increased text-xl to text-2xl */}
        </div>
        <Edit3 className="ml-2 h-5 w-5 text-slate-300 hover:text-white"/>
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
            {Math.round(buffer ?? 0).toLocaleString()} triệu/tháng
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
              setValue: (val) => {
                setSalaryGrowth(val);
                updatePlaygroundValue(plan.id, "pctSalaryGrowth", val);
              },
              suffix: "%",
              max: 100,
            },
            {
              label: "Lợi nhuận đầu tư (năm):",
              value: investmentReturn,
              setValue: (val) => {
                setInvestmentReturn(val);
                updatePlaygroundValue(plan.id, "pctInvestmentReturn", val);
              },
              suffix: "%",
              max: 100,
            },
            {
              label: "Chi tiêu (tháng):",
              value: monthlyExpense,
              setValue: (val) => {
                setMonthlyExpense(val);
                updatePlaygroundValue(plan.id, "monthlyLivingExpenses", val);
              },
              suffix: "tr",
              max: 50,
            },
            {
              label: "Thu nhập thêm (tháng):",
              value: extraIncome,
              setValue: (val) => {
                setExtraIncome(val);
                updatePlaygroundValue(plan.id, "monthlyOtherIncome", val);
              },
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
                  if (!checked) setShowEmergencyFundWarning(true);
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
                  if (!checked) setShowEmergencyInsuranceWarning(true);
                  setHasInsurance(checked);
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
        <Button
          type="button"
          onClick={() => {
            setSalaryGrowth(plan.pctSalaryGrowth);
            setInvestmentReturn(plan.pctInvestmentReturn);
            setMonthlyExpense(plan.monthlyLivingExpenses);
            setExtraIncome(plan.monthlyOtherIncome);

          }}
        >
          Reset giả định ban đầu
        </Button>
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
              onClick={async () => {
                setShowConfirmModal(false);
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
