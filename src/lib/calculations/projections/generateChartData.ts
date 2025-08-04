import { PlanWithDetails } from "./generateProjections";
import { ProjectionRow } from "../affordability";

export interface ChartMilestone {
  name: string,
  cumulativeSavingsFromInitial: number,
  cumulativeSavingsFromMonthly: number,
  cumulativeSavings: number,
}

export function generateAccumulationMilestones(
  projectionData: ProjectionRow[],
  plan: PlanWithDetails,
): ChartMilestone[] {
  const milestones: ChartMilestone[] = [];

  const baseDate = plan.createdAt ? new Date(plan.createdAt) : new Date();
  let month = baseDate.getMonth() + 1;
  let year = baseDate.getFullYear();

  const confirmedPurchaseYear = plan.confirmedPurchaseYear ?? year;
  const length = confirmedPurchaseYear - year;

  let initialSavings = plan.initialSavings || 0;
  if (
    plan.familySupport?.familySupportType === "GIFT" &&
    plan.familySupport?.familyGiftTiming === "NOW" &&
    plan.familySupport?.familySupportAmount
  ) {
    initialSavings += plan.familySupport.familySupportAmount;
  }

  milestones.push({
    name: "Hiện tại",
    cumulativeSavingsFromInitial: Math.round(initialSavings),
    cumulativeSavingsFromMonthly: 0,
    cumulativeSavings: Math.round(initialSavings),
  });

  // Biến để track kết quả của cột mốc trước đó
  let previousCumulativeSavingsFromInitial = initialSavings;
  let previousCumulativeSavingsFromMonthly = 0;

  for (let i = 0; i < length; i++) {
    const p = projectionData[i];

    // === CỘT MỐC 1: 6 tháng đầu năm ===
    month += 6;
    if (month > 12) {
      month -= 12;
      year += 1;
    }
    const paddedMonth1 = month.toString().padStart(2, "0");
    const label1 = `${paddedMonth1}/${year}`;

    const annualReturnRate = p.pctInvestmentReturn / 100;
    const monthlyRate = Math.pow(1 + annualReturnRate, 1 / 12);

    // Tính toán cho 6 tháng đầu
    const cumulativeSavingsFromInitial1 = previousCumulativeSavingsFromInitial * Math.pow(monthlyRate, 6);

    // Cột mốc đầu tiên: chỉ có monthly savings mới
    let cumulativeSavingsFromMonthly1;
    if (i === 0) {
      // Cột mốc đầu tiên: chỉ tính monthly savings mới
      cumulativeSavingsFromMonthly1 = p.annualSavings / 12 * (Math.pow(monthlyRate, 6) - 1) / (monthlyRate - 1);
    } else {
      // Các cột mốc sau: có cả previous savings và monthly savings mới
      cumulativeSavingsFromMonthly1 = previousCumulativeSavingsFromMonthly * Math.pow(monthlyRate, 6) +
        p.annualSavings / 12 * (Math.pow(monthlyRate, 6) - 1) / (monthlyRate - 1);
    }

    milestones.push({
      name: label1,
      cumulativeSavingsFromInitial: Math.round(cumulativeSavingsFromInitial1),
      cumulativeSavingsFromMonthly: Math.round(cumulativeSavingsFromMonthly1),
      cumulativeSavings: Math.round(cumulativeSavingsFromInitial1 + cumulativeSavingsFromMonthly1),
    });

    // === CỘT MỐC 2: 12 tháng cuối năm ===
    month += 6;
    if (month > 12) {
      month -= 12;
      year += 1;
    }
    const paddedMonth2 = month.toString().padStart(2, "0");
    const label2 = `${paddedMonth2}/${year}`;

    // Tính toán cho 12 tháng (dựa trên kết quả 6 tháng)
    const cumulativeSavingsFromInitial2 = cumulativeSavingsFromInitial1 * Math.pow(monthlyRate, 6);
    const cumulativeSavingsFromMonthly2 = previousCumulativeSavingsFromMonthly * Math.pow(monthlyRate, 12) +
      p.annualSavings / 12 * (Math.pow(monthlyRate, 12) - 1) / (monthlyRate - 1);

    milestones.push({
      name: label2,
      cumulativeSavingsFromInitial: Math.round(cumulativeSavingsFromInitial2),
      cumulativeSavingsFromMonthly: Math.round(cumulativeSavingsFromMonthly2),
      cumulativeSavings: Math.round(cumulativeSavingsFromInitial2 + cumulativeSavingsFromMonthly2),
    });

    // Cập nhật kết quả cho năm tiếp theo
    previousCumulativeSavingsFromInitial = cumulativeSavingsFromInitial2;
    previousCumulativeSavingsFromMonthly = cumulativeSavingsFromMonthly2;
  }

  return milestones;
}
