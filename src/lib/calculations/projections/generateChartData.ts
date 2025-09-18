import { PlanWithDetails } from "./generateProjections";

// Giao diện ChartMilestone giữ nguyên, rất linh hoạt
export interface ChartMilestone {
  name: string; // Trục X, thường là năm
  value: number; // Trục Y, giá trị của dữ liệu cần vẽ
  value2?: number; // Giá trị thứ 2 để vẽ đường so sánh (ví dụ: giá nhà)
}

// Kiểu dữ liệu cho các key có thể vẽ biểu đồ, khớp với chartDataKey trong Assumption.tsx
export type DataKey = 'pctSalaryGrowth' | 'pctHouseGrowth' | 'pctInvestmentReturn';

/**
 * Tạo ra một chuỗi dữ liệu đơn giản để vẽ biểu đồ minh họa sự tăng trưởng của một biến số duy nhất,
 * tập trung vào khoảng thời gian xung quanh năm mua nhà dự kiến.
 */
export function generateAccumulationMilestones(
  plan: PlanWithDetails,
  dataKey: DataKey
): ChartMilestone[] {
  const milestones: ChartMilestone[] = [];
  const currentYear = new Date().getFullYear();

  // 1. Xác định năm trung tâm của biểu đồ.
  // Nếu chưa có năm xác nhận, dùng năm mục tiêu ban đầu.
  const centerYear = plan.confirmedPurchaseYear || 0;
  console.log(centerYear)

  // 2. Xác định khoảng thời gian hiển thị (ví dụ: 5 năm trước và 5 năm sau)
  const range = 2;
  const startYear = centerYear - range;
  const endYear = centerYear + range;

  let initialValue = 0;
  let growthRate = 0;

  // 3. Lấy giá trị ban đầu và % tăng trưởng tương ứng với dataKey
  switch (dataKey) {
    case 'pctSalaryGrowth':
      initialValue = (plan.userMonthlyIncome || 0) * 12; // Thu nhập năm
      growthRate = plan.pctSalaryGrowth || 0;
      break;
    case 'pctHouseGrowth':
      initialValue = plan.targetHousePriceN0 || 0;
      growthRate = plan.pctHouseGrowth || 0;
      break;
    case 'pctInvestmentReturn':
      // Minh họa sự tăng trưởng của khoản tiết kiệm ban đầu
      initialValue = plan.initialSavings || 0;
      growthRate = plan.pctInvestmentReturn || 0;
      break;
  }

  // 4. Lặp qua các năm cần hiển thị và tính toán giá trị
  for (let year = startYear; year <= endYear; year++) {
    if (year < currentYear) continue;

    let currentValue = 0;

    if (dataKey === 'pctInvestmentReturn') {
      const annualRate = (plan.pctInvestmentReturn || 0) / 100;
      const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

      // Tính các đại lượng tại năm t dựa trên tăng trưởng
      const n = year - currentYear; // số năm sau N0

      // Income năm N0
      const userIncomeN0 = (plan.userMonthlyIncome || 0) * 12;
      const coIncomeN0 = (plan.hasCoApplicant ? (plan.familySupport?.coApplicantMonthlyIncome || 0) : 0) * 12;
      const otherIncomeN0 = (plan.familySupport?.monthlyOtherIncome || 0) * 12;

      // Income năm t
      const userIncome_t = userIncomeN0 * Math.pow(1 + (plan.pctSalaryGrowth || 0) / 100, n);
      const coIncome_t = coIncomeN0 * Math.pow(1 + (plan.coApplicantSalaryGrowth || 0), n); // nếu bạn lưu % đã là số thập phân, còn nếu là % thì chia 100
      const otherIncome_t = otherIncomeN0; // giữ nguyên; nếu muốn, bạn có thể cho tăng
      const annualIncome_t = userIncome_t + coIncome_t + otherIncome_t;

      // Expenses năm N0
      const baseExpensesN0 = (plan.monthlyLivingExpenses || 0) * 12;
      const nonHousingDebtN0 = (plan.monthlyNonHousingDebt || 0) * 12;
      const insuranceN0 = plan.currentAnnualInsurancePremium || 0;

      // Expenses t (tăng theo pctExpenseGrowth)
      const baseExpenses_t = baseExpensesN0 * Math.pow(1 + (plan.pctExpenseGrowth || 0) / 100, n);
      const nonHousingDebt_t = nonHousingDebtN0; // giả định không tăng; nếu muốn, cho tăng giống baseExpenses
      const insurance_t = insuranceN0;           // giả định giữ nguyên

      // Child expenses nếu có, áp dụng từ năm >= yearToHaveChild, và trượt theo pctExpenseGrowth
      const projectionYear = year;
      let childExpenses_t = 0;
      if (plan.hasNewChild && plan.yearToHaveChild && plan.monthlyChildExpenses && projectionYear >= plan.yearToHaveChild) {
        const yearsSinceChild = projectionYear - plan.yearToHaveChild;
        childExpenses_t = (plan.monthlyChildExpenses * 12) * Math.pow(1 + (plan.pctExpenseGrowth || 0) / 100, yearsSinceChild);
      }

      const annualExpenses_t = baseExpenses_t + nonHousingDebt_t + insurance_t + childExpenses_t;

      // Khoản tiết kiệm ròng năm t
      const annualSavings_t = Math.max(0, annualIncome_t - annualExpenses_t); // không để âm (tuỳ yêu cầu)

      if (n === 0) {
        // N0 (Năm hiện tại): Khớp với generateProjections.
        // Chỉ lấy tiền tiết kiệm ban đầu + 1 tháng tiết kiệm ròng của năm đó, không tính lãi gộp.
        currentValue = (plan.initialSavings || 0) + (annualSavings_t / 12);
      } else {
        // Các năm tiếp theo (n > 0): Tính tích lũy gộp đầy đủ vào cuối năm.
        
        // Số dư đầu năm t (lấy từ giá trị cuối năm trước)
        const startOfYearSavings = (milestones.length > 0)
          ? milestones[milestones.length - 1].value
          : (plan.initialSavings || 0);

        // Tích lũy đến cuối năm t
        const baseGrowth = startOfYearSavings * Math.pow(1 + monthlyRate, 12);
        const monthlyContribution = annualSavings_t / 12;
        const newGrowth = monthlyRate === 0
          ? monthlyContribution * 12
          : monthlyContribution * ((Math.pow(1 + monthlyRate, 12) - 1) / monthlyRate);

        currentValue = baseGrowth + newGrowth;
      }
      
      currentValue = Math.round(currentValue);

      // Tính toán giá trị so sánh (giá nhà dự kiến)
      const initialHousePrice = plan.targetHousePriceN0 || 0;
      const houseGrowthRate = plan.pctHouseGrowth || 0;
      const comparisonValue = initialHousePrice * Math.pow(1 + houseGrowthRate / 100, n) - currentValue;

      milestones.push({ 
        name: `${year}`, 
        value: currentValue,
        value2: Math.round(comparisonValue),
      });

    } else {
      currentValue = initialValue * Math.pow(1 + growthRate / 100, year - currentYear);
      milestones.push({ name: `${year}`, value: Math.round(currentValue) });
    }
  }

  return milestones;
}
