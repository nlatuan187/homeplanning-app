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
  const length = confirmedPurchaseYear - year

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

  for (let i = 0; i < length; i++) {
    const p = projectionData[i];

    month += 6;
    if (month > 12) {
      month -= 12;
      year += 1;
    }
    const paddedMonth1 = month.toString().padStart(2, "0");
    const label1 = `${paddedMonth1}/${year}`;

    const annualReturnRate = p.pctInvestmentReturn / 100;
    const monthlyRate = Math.pow(1 + annualReturnRate, 1 / 12);
    const math = (Math.pow(monthlyRate, 6) - 1) / (Math.pow(monthlyRate, 12) - 1)

    const cumulativeSavingsFromMonthly = p.cumulativeSavingsFromMonthly * math
    const cumulativeSavingsFromInitial = p.cumulativeSavingsFromInitial / Math.pow(monthlyRate, 6)

    milestones.push({
      name: label1,
      cumulativeSavingsFromInitial: cumulativeSavingsFromInitial,
      cumulativeSavingsFromMonthly: cumulativeSavingsFromMonthly,
      cumulativeSavings: cumulativeSavingsFromInitial + cumulativeSavingsFromMonthly,
    });

    // Mốc sau 12 tháng (tức là thêm 6 tháng nữa)
    month += 6;
    if (month > 12) {
      month -= 12;
      year += 1;
    }
    const paddedMonth2 = month.toString().padStart(2, "0");
    const label2 = `${paddedMonth2}/${year}`;

    // Dùng lại p hoặc tính thêm nếu cần khác biệt giữa 6 và 12 tháng
    milestones.push({
      name: label2,
      cumulativeSavingsFromInitial: Math.round(p.cumulativeSavingsFromInitial ?? 0),
      cumulativeSavingsFromMonthly: Math.round(p.cumulativeSavingsFromMonthly ?? 0),
      cumulativeSavings: Math.round(p.cumulativeSavings ?? 0),
    });
  }

  return milestones;
}
