"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import { Plan } from "@prisma/client";
import { useDebouncedCallback } from "use-debounce";
import { generateProjections, PlanWithDetails } from "@/lib/calculations/projections/generateProjections";
import { ProjectionRow } from "@/lib/calculations/affordability";
import { ArrowLeft, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AccumulationChart from "@/components/plan/playground/AccumulationChart";
import FinancialSliders from "@/components/plan/playground/FinancialSliders";
import { useDebounce } from "@/hooks/useDebounce";
import { updatePlaygroundValue, updatePlaygroundValues, upsertInteractionLogEntry, cachePlaygroundProjections } from "@/actions/updatePlayground";
import { confirmPlaygroundAssumptions } from "@/actions/confirmPlaygroundAssumptions";
import { generateAccumulationMilestones } from "@/lib/calculations/projections/generateChartData";
import { calculateAdditionalSavingsForViability } from "@/lib/calculations/affordabilityHelpers";
import { editPlan } from "@/actions";
// import { db } from "@/lib/db";

type InteractionLogEntry = {
  timestamp: string;
  type: "interaction_start" | "initial_change" | "reset_to_initial" | "final_submit";
  values?: Record<string, any>;
};

export default function PlaygroundPageClient({ initialPlan }: { initialPlan: PlanWithDetails }) {
  const router = useRouter();
  const planId = useParams().planId as string;

  const [plan, setPlan] = useState<PlanWithDetails>(initialPlan);
  const [targetYear, setTargetYear] = useState<number>(0);
  const confirmedPurchaseYearRef = useRef<number | null>(null);
  const [projection, setProjection] = useState<ProjectionRow | null>(null);

  const [salaryGrowth, setSalaryGrowth] = useState(plan.pctSalaryGrowth);
  const [investmentReturn, setInvestmentReturn] = useState(plan.pctInvestmentReturn);
  const [monthlyExpense, setMonthlyExpense] = useState(plan.monthlyLivingExpenses);
  const [extraIncome, setExtraIncome] = useState(plan.monthlyOtherIncome);

  const [hasEmergencyFund, setHasEmergencyFund] = useState(true);
  const [hasInsurance, setHasInsurance] = useState(true);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEmergencyFundWarning, setShowEmergencyFundWarning] = useState(false);
  const [showEmergencyInsuranceWarning, setShowEmergencyInsuranceWarning] = useState(false);
  
  const [sliderKey, setSliderKey] = useState(0);

  // === START: LOGIC MỚI ===

  // 1. Khởi tạo log từ DB thông qua `initialPlan`
  // Giờ đây, database là "nguồn chân lý" cho log.
  const [interactionLog, setInteractionLog] = useState<InteractionLogEntry[]>(
    () => (initialPlan.history?.interactionLog as InteractionLogEntry[]) || []
  );

  // Ref này vẫn hữu ích để lưu các giá trị ban đầu cho log 'interaction_start'
  const initialStateRef = useRef<any>({});

  // 2. Tạo hàm debounced để gọi server action
  // Giúp tránh gọi lên server quá nhiều, chỉ lưu sau khi người dùng ngưng tương tác 1.5s
  const debouncedSaveLog = useDebouncedCallback(
    (entryToSave: InteractionLogEntry) => {
      upsertInteractionLogEntry(planId, entryToSave);
    },
    1500
  );

  // 3. Hàm ghi log trung tâm
  // Tất cả các tương tác trên UI sẽ gọi hàm này.
  const recordInteraction = (type: InteractionLogEntry['type'], data: Record<string, any> = {}) => {
    setInteractionLog(prevLog => {
      const newEntry: InteractionLogEntry = {
        timestamp: new Date().toISOString(),
        type,
        values: data,
      };

      let updatedLog = [...prevLog];
      const lastLog = updatedLog.length > 0 ? updatedLog[updatedLog.length - 1] : null;

      // Logic gom nhóm: Nếu tương tác mới có cùng type 'initial_change' với log cuối cùng,
      // ta sẽ gộp chúng lại thay vì tạo log mới.
      if (lastLog && lastLog.type === 'initial_change' && newEntry.type === 'initial_change') {
        const mergedValues = { ...(lastLog.values || {}), ...(newEntry.values || {}) };
        updatedLog[updatedLog.length - 1] = {
          ...lastLog,
          timestamp: newEntry.timestamp,
          values: mergedValues,
        };
      } else {
        updatedLog.push(newEntry);
      }

      // Lấy entry vừa được cập nhật/thêm mới để gửi đi lưu trữ
      const entryToSave = updatedLog[updatedLog.length - 1];
      if (entryToSave) {
        debouncedSaveLog(entryToSave);
      }

      return updatedLog;
    });
  };

  // 4. useEffect khởi tạo và xử lý phiên làm việc
  useEffect(() => {
    initialStateRef.current = {
      pctSalaryGrowth: initialPlan.pctSalaryGrowth,
      pctInvestmentReturn: initialPlan.pctInvestmentReturn,
      monthlyLivingExpenses: initialPlan.monthlyLivingExpenses,
      monthlyOtherIncome: initialPlan.monthlyOtherIncome,
      hasEmergencyFund: false,
      hasInsurance: (initialPlan.currentAnnualInsurancePremium ?? 0) > 0,
    };

    // Logic "Session Flag"
    const isSessionActive = sessionStorage.getItem('playground_session_active') === 'true';

    if (!isSessionActive) {
      // Nếu không có session active -> đây là một lần truy cập mới (từ trang khác).
      // -> Tạo log mới.
      recordInteraction('interaction_start', { initialValues: initialStateRef.current });
      
      // -> Đặt cờ để đánh dấu session này đã active.
      sessionStorage.setItem('playground_session_active', 'true');
    }
    // Ngược lại, nếu isSessionActive là true -> người dùng vừa F5, ta không làm gì cả.

    // Hàm cleanup của useEffect:
    // Sẽ được gọi khi component unmount (khi người dùng điều hướng RỜI KHỎI trang này).
    return () => {
      sessionStorage.removeItem('playground_session_active');
    };
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy một lần duy nhất khi component mount

  // === END: LOGIC MỚI ===

  const [playgroundProjections, setPlaygroundProjections] = useState<ProjectionRow[]>(() => {
    const defaultTargetYear = new Date().getFullYear() + plan.yearsToPurchase;
    const confirmedYear = plan.confirmedPurchaseYear || defaultTargetYear;
    const yearsToProject = confirmedYear - new Date().getFullYear();
    
    return generateProjections({
      ...plan,
      pctSalaryGrowth: salaryGrowth,
      pctInvestmentReturn: investmentReturn,
      monthlyLivingExpenses: monthlyExpense,
      monthlyOtherIncome: extraIncome,
      paymentMethod: plan.paymentMethod === "fixed" ? "fixed" : "decreasing",
    }, yearsToProject);
  });

  const debouncedSalaryGrowth = useDebounce(salaryGrowth, 300);
  const debouncedInvestmentReturn = useDebounce(investmentReturn, 300);
  const debouncedMonthlyExpense = useDebounce(monthlyExpense, 300);
  const debouncedExtraIncome = useDebounce(extraIncome, 300);

  const calculateRecommendedInsurance = (monthlyExpense: number) => {
    const annualExpenses = monthlyExpense * 12 + (plan.monthlyNonHousingDebt || 0) * 12;
    const recommendedAmount = annualExpenses * 0.125;
    const currentInsurance = plan.currentAnnualInsurancePremium || 0;
    return Math.max(0, recommendedAmount - currentInsurance);
  };

  const calculateEmergencyFund = (monthlyExpense: number) => {
    return monthlyExpense * 6;
  };

  const computedProjections = useMemo(() => {
    const basePlan = {
      ...plan,
      pctSalaryGrowth: debouncedSalaryGrowth,
      pctInvestmentReturn: debouncedInvestmentReturn,
      monthlyLivingExpenses: debouncedMonthlyExpense,
      monthlyOtherIncome: debouncedExtraIncome,
      paymentMethod: plan.paymentMethod === "fixed" ? "fixed" : "decreasing",
    };
    let adjustedPlan = basePlan;
    if (hasInsurance) {
      const recommendedAmount = calculateRecommendedInsurance(debouncedMonthlyExpense);
      adjustedPlan = { ...adjustedPlan, currentAnnualInsurancePremium: (plan.currentAnnualInsurancePremium || 0) + recommendedAmount };
    }
    if (hasEmergencyFund) {
      const emergencyFundAmount = calculateEmergencyFund(debouncedMonthlyExpense);
      adjustedPlan = { ...adjustedPlan, initialSavings: Math.max(0, basePlan.initialSavings - emergencyFundAmount) };
    }
    const defaultTargetYear = new Date().getFullYear() + plan.yearsToPurchase;
    const confirmedYear = plan.confirmedPurchaseYear || defaultTargetYear;
    const yearsToProject = confirmedYear - new Date().getFullYear();
    return generateProjections(adjustedPlan, yearsToProject);
  }, [plan, debouncedSalaryGrowth, debouncedInvestmentReturn, debouncedMonthlyExpense, debouncedExtraIncome, hasInsurance, hasEmergencyFund]);

  useEffect(() => {
    setPlan(initialPlan);
    const projections = generateProjections({ ...initialPlan, paymentMethod: initialPlan.paymentMethod as "fixed" | "decreasing" });
    setPlaygroundProjections(projections);
    const defaultTargetYear = new Date().getFullYear() + initialPlan.yearsToPurchase;
    const confirmedYear = initialPlan.confirmedPurchaseYear || defaultTargetYear;
    confirmedPurchaseYearRef.current = confirmedYear;
    setTargetYear(confirmedYear);
    const confirmedProjection = projections.find((p) => p.year === confirmedYear) || null;
    setProjection(confirmedProjection);
    setSalaryGrowth(initialPlan.pctSalaryGrowth ?? 0);
    setInvestmentReturn(initialPlan.pctInvestmentReturn ?? 0);
    setMonthlyExpense(initialPlan.monthlyLivingExpenses ?? 0);
    setExtraIncome(initialPlan.monthlyOtherIncome ?? 0);
    setHasEmergencyFund(false);
    setHasInsurance((initialPlan.currentAnnualInsurancePremium ?? 0) > 0);
  }, [initialPlan]);

  useEffect(() => {
    setPlaygroundProjections(computedProjections);
    const confirmedYear = confirmedPurchaseYearRef.current!;
    const confirmedProjection = computedProjections.find((p) => p.year === confirmedYear) || null;
    setProjection(confirmedProjection);
    const bufferValue = confirmedProjection?.buffer ?? 0;
    const shouldBeScenario = bufferValue < 0 ? "ScenarioA" : "ScenarioB";
    if (plan.affordabilityOutcome !== shouldBeScenario) {
      setPlan((prev) => ({ ...prev, affordabilityOutcome: shouldBeScenario }));
      updatePlaygroundValue(plan.id, "affordabilityOutcome", shouldBeScenario);
    }
  }, [computedProjections, plan.id, plan.affordabilityOutcome]);

  useEffect(() => {
    if (!plan) return;
    updatePlaygroundValues(plan.id, {
      pctSalaryGrowth: debouncedSalaryGrowth,
      pctInvestmentReturn: debouncedInvestmentReturn,
      monthlyLivingExpenses: debouncedMonthlyExpense,
      monthlyOtherIncome: debouncedExtraIncome,
      buffer: projection?.buffer ?? 0,
    });
  }, [debouncedSalaryGrowth, debouncedInvestmentReturn, debouncedMonthlyExpense, debouncedExtraIncome, plan]);

  const handleReset = () => {
    setSalaryGrowth(initialStateRef.current.pctSalaryGrowth);
    setInvestmentReturn(initialStateRef.current.pctInvestmentReturn);
    setMonthlyExpense(initialStateRef.current.monthlyLivingExpenses);
    setExtraIncome(initialStateRef.current.monthlyOtherIncome);
    setHasEmergencyFund(initialStateRef.current.hasEmergencyFund);
    setHasInsurance(initialStateRef.current.hasInsurance);
    setSliderKey((prev) => prev + 1);
    
    // Ghi log cho hành động reset
    recordInteraction('reset_to_initial', { values: initialStateRef.current });
  };

  const handleEditPlan = async () => {
    try {
      await editPlan(plan.id, undefined, "goal");
      router.push(`/plan/new?edit=${plan.id}`);
    } catch (error) {
      console.error("Error editing plan:", error);
    }
  };

  const handleConfirm = async () => {
    setShowConfirmModal(false);

    // Bước 1: Tạo và lưu ngay lập tức entry log cuối cùng.
    // Chúng ta không dùng `recordInteraction` vì không muốn debounce hành động này.
    const finalLogEntry: InteractionLogEntry = {
      timestamp: new Date().toISOString(),
      type: "final_submit", // Sử dụng một type riêng biệt
      // Có thể thêm các giá trị cuối cùng vào đây nếu muốn
      values: {
        pctSalaryGrowth: salaryGrowth,
        pctInvestmentReturn: investmentReturn,
        monthlyLivingExpenses: monthlyExpense,
        monthlyOtherIncome: extraIncome,
      },
    };
    await upsertInteractionLogEntry(planId, finalLogEntry);

    // Bước 2: Gọi action để chốt các giả định (không cần gửi log nữa)
    await confirmPlaygroundAssumptions(
      planId,
      {
        pctSalaryGrowth: salaryGrowth,
        pctInvestmentReturn: investmentReturn,
        monthlyLivingExpenses: monthlyExpense,
        monthlyOtherIncome: extraIncome,
      }
    );

    await cachePlaygroundProjections(planId, generateProjections(plan));

    // Bước 3: Điều hướng người dùng
    const yearsToPurchase = confirmedProjection?.n ?? plan.yearsToPurchase;
    if (yearsToPurchase <= 3) {
      router.push(`/plan/${planId}/roadmap`);
    } else {
      router.push(`/plan/${planId}/report`);
    }
  };

  const monthPurchase = plan.createdAt ? new Date(plan.createdAt).getMonth() + 1 : '';
  const confirmedYear = confirmedPurchaseYearRef.current! || targetYear;
  const confirmedProjection = playgroundProjections.find(p => p.year === confirmedYear);
  const housePriceProjected = projection?.housePriceProjected ?? plan.targetHousePriceN0;
  const loanAmountNeeded = projection?.loanAmountNeeded ?? 0;
  const tiLeTienCanVay =
    housePriceProjected > 0 ? Math.round((loanAmountNeeded / housePriceProjected) * 100) : 0;
  const soTienCanVay = loanAmountNeeded / 1000;
  const adjustedPlanForChart = {
    ...plan,
    initialSavings: hasEmergencyFund 
      ? Math.max(0, plan.initialSavings - calculateEmergencyFund(monthlyExpense))
      : plan.initialSavings,
    currentAnnualInsurancePremium: hasInsurance
      ? (plan.currentAnnualInsurancePremium || 0) + calculateRecommendedInsurance(monthlyExpense)
      : plan.currentAnnualInsurancePremium
  };

  const chartData = useMemo(() => {
    return generateAccumulationMilestones(playgroundProjections, adjustedPlanForChart);
  }, [playgroundProjections, adjustedPlanForChart]);

  const soTienDangThieu = confirmedProjection
  ? calculateAdditionalSavingsForViability(
      confirmedProjection,
      plan.loanInterestRate ?? 0,
      plan.loanTermYears ?? 0,
    )
  : 0;

  const baseAnnualExpenses = monthlyExpense * 12 + (plan.monthlyNonHousingDebt || 0) * 12;
  const recommendedInsuranceAmount = Math.round(baseAnnualExpenses * 0.125);
  const currentInsuranceAmount = plan.currentAnnualInsurancePremium || 0;
  
  const emergencyFund = calculateEmergencyFund(monthlyExpense);
  const insurancePremium = hasInsurance ? recommendedInsuranceAmount : currentInsuranceAmount;
  if (!plan || !projection) return <div>Loading...</div>;
  
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 mb-8">
      <header className="container mx-auto max-w-5xl px-4 pt-8 py-6 flex justify-between items-center sticky top-0 bg-slate-950 z-40 border-b border-slate-800">
        <Button onClick={() => router.push(`/plan/${planId}/results`)} variant="ghost" size="icon" className="text-white left-4">
          <ArrowLeft className="h-5 w-5 text-slate-300 hover:text-white" />
        </Button>
        <div className="flex flex-col items-center">
          <div className={`text-2xl font-bold ${plan.affordabilityOutcome === "ScenarioB" ? "text-green-500" : "text-red-500"}`}>
            {plan.affordabilityOutcome === "ScenarioB" ? "Mục tiêu khả thi" : "Mục tiêu không khả thi"}
          </div>
          <div className="text-[14px] text-gray-400">
            Mua nhà vào {plan.createdAt.getMonth().toLocaleString("en-US", { minimumIntegerDigits: 2 })}/
            {plan.confirmedPurchaseYear || targetYear} với giá {Math.round(housePriceProjected).toLocaleString()}
          </div>
        </div>
        <Button onClick={handleEditPlan} variant="ghost" size="icon" className="text-white left-4 p-2 -mr-2">
          <Edit3 className="h-5 w-5 text-slate-300 hover:text-white" />
        </Button>
      </header>

      {plan.affordabilityOutcome === "ScenarioB" ? (
        <div className="container mx-auto max-w-5xl px-4 pb-2 pt-6 flex flex-row gap-4">
          <div className="bg-white text-black rounded-lg shadow px-6 py-4 flex-1 flex flex-col justify-center">
            <h2 className="text-lg font-semibold whitespace-nowrap text-center">
              {soTienCanVay.toFixed(2)} tỷ ~ {tiLeTienCanVay}%
            </h2>
            <p className="text-sm text-center mt-1">Số tiền cần vay & Tỷ lệ vay</p>
          </div>
          <div className="bg-white text-black rounded-lg shadow px-6 py-4 flex-1 flex flex-col justify-center">
            <h2 className="text-lg font-semibold whitespace-nowrap text-center">
              {Math.round(projection?.buffer ?? 0).toLocaleString()} triệu/tháng
            </h2>
            <p className="text-sm text-center mt-1">Khoản dư sau khi trả nợ</p>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <div className="w-full h-[140px] sm:h-[180px] bg-white text-black rounded-xl shadow flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-2xl sm:text-3xl font-bold">
            {soTienDangThieu.toLocaleString()} triệu
          </h2>
            <p className="text-sm sm:text-xl text-black mt-1">Số tiền bạn đang thiếu</p>
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-5xl px-4 py-2">
        <AccumulationChart data={chartData} />
        <FinancialSliders
          key={sliderKey}
          items={[
            {
              label: "Tăng lương (năm):",
              value: salaryGrowth,
              setValue: (val) => {
                setSalaryGrowth(val);
                recordInteraction("initial_change", { pctSalaryGrowth: val });
              },
              suffix: "%",
              max: 100,
            },
            {
              label: "Lợi nhuận đầu tư (năm):",
              value: investmentReturn,
              setValue: (val) => {
                setInvestmentReturn(val);
                recordInteraction("initial_change", { pctInvestmentReturn: val });
              },
              suffix: "%",
              max: 100,
            },
            {
              label: "Chi tiêu (tháng):",
              value: monthlyExpense,
              setValue: (val) => {
                setMonthlyExpense(val);
                recordInteraction("initial_change", { monthlyLivingExpenses: val });
              },
              suffix: "tr",
              max: 50,
            },
            {
              label: "Thu nhập thêm (tháng):",
              value: extraIncome,
              setValue: (val) => {
                setExtraIncome(val);
                recordInteraction("initial_change", { monthlyOtherIncome: val });
              },
              suffix: "tr",
              max: 50,
            },
          ]}
        />
      </div>

      <div className="container mx-auto my-3 max-w-5xl px-4 pt-2 text-sm text-white border-t border-gray-600">
        <div className="grid grid-cols-3 gap-4 items-center">
          <label className="text-left">Quỹ dự phòng:</label>
          <div className="text-left">{emergencyFund.toLocaleString()} triệu (6 tháng chi tiêu)</div>
          <div className="flex justify-end">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hasEmergencyFund}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (!checked) setShowEmergencyFundWarning(true);
                  setHasEmergencyFund(checked);
                  recordInteraction("initial_change", { hasEmergencyFund: checked });
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-400 rounded-full peer peer-checked:bg-cyan-500 transition-all" />
              <div className="absolute w-4 h-4 bg-white rounded-full left-1 top-1 peer-checked:translate-x-5 transition-all" />
            </label>
          </div>

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
                  recordInteraction("initial_change", { hasInsurance: checked });
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
        <Button type="button" onClick={handleReset}>
          Reset giả định ban đầu
        </Button>

        {plan.affordabilityOutcome === "ScenarioB" ? (
          <Button type="button" variant="outline" onClick={() => setShowConfirmModal(true)}>
            Tiếp tục
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => editPlan(plan.id, undefined, "goal")}>
            Thay đổi toàn bộ kế hoạch
          </Button>
        )}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-center shadow-xl relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setShowConfirmModal(false)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-lg font-bold mb-2 text-black">XÁC NHẬN GIẢ ĐỊNH</h2>
            <div className="flex justify-center mb-4">
              <div className="bg-green-500 rounded-full p-2">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Kế hoạch hành động sẽ được thiết kế dựa trên những con số bạn chốt. Bạn sẽ không thể thay đổi giả định lần nữa, vì vậy hãy kiểm tra kỹ trước khi tiếp tục nhé!
            </p>
            <button className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 text-sm font-semibold" onClick={handleConfirm}>
              Chốt và thiết kế kế hoạch hành động
            </button>
          </div>
        </div>
      )}

      {showEmergencyFundWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-center shadow-xl relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowEmergencyFundWarning(false)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-lg font-bold mb-1 text-red-600 uppercase">Hãy cẩn thận!</h2>
            <p className="text-gray-800 font-semibold mb-4">Bạn không muốn xây dựng quỹ dự phòng sao?</p>
            <div className="flex justify-center mb-4">
              <div className="bg-transparent p-2">
                <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 0 1 .894.553l7 14A1 1 0 0 1 17 18H3a1 1 0 0 1-.894-1.447l7-14A1 1 0 0 1 10 2zm0 4a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0V7a1 1 0 0 0-1-1zm0 8a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 10 14z" /></svg>
              </div>
            </div>
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
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowEmergencyInsuranceWarning(false)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-lg font-bold mb-1 text-red-600 uppercase">Hãy cẩn thận!</h2>
            <p className="text-gray-800 font-semibold mb-4">Bạn không muốn trang bị bảo hiểm nhân thọ sao?</p>
            <div className="flex justify-center mb-4">
              <div className="bg-transparent p-2">
                <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 0 1 .894.553l7 14A1 1 0 0 1 17 18H3a1 1 0 0 1-.894-1.447l7-14A1 1 0 0 1 10 2zm0 4a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0V7a1 1 0 0 0-1-1zm0 8a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 10 14z" /></svg>
              </div>
            </div>
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