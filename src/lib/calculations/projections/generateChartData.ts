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
  let month = baseDate.getMonth();
  let year = baseDate.getFullYear();

  // Tính toán số năm cần projection dựa trên confirmedPurchaseYear
  const defaultTargetYear = new Date().getFullYear() + plan.yearsToPurchase;
  const confirmedYear = plan.confirmedPurchaseYear || defaultTargetYear;
  const length = confirmedYear - new Date().getFullYear();

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
    
    // Kiểm tra nếu projectionData không có đủ dữ liệu
    if (!p) {
      console.warn(`Missing projection data for year ${i}`);
      break;
    }
    // === CỘT MỐC 1: 6 tháng đầu năm ===
    const annualReturnRate = p.pctInvestmentReturn / 100;
    const monthlyRate = Math.pow(1 + annualReturnRate, 1 / 12);

    // Tính toán cho 6 tháng đầu
    const cumulativeSavingsFromInitial1 = previousCumulativeSavingsFromInitial * Math.pow(monthlyRate, 6);
    // Cột mốc đầu tiên: chỉ có monthly savings mới
    let cumulativeSavingsFromMonthly1;
    if (i === 0) {
      if (month > 6) {
        cumulativeSavingsFromMonthly1 = p.annualSavings / 12 * (Math.pow(monthlyRate, 12 - month) - 1) / (monthlyRate - 1) * Math.pow(monthlyRate, month - 6)
          + projectionData[i + 1].annualSavings / 12 * (Math.pow(monthlyRate, month - 6) - 1) / (monthlyRate - 1) ;
      } else {
        cumulativeSavingsFromMonthly1 = p.annualSavings / 12 * (Math.pow(monthlyRate, 6) - 1) / (monthlyRate - 1) ;
      }
    } else {
      if (month > 6) {
        cumulativeSavingsFromMonthly1 = previousCumulativeSavingsFromMonthly* (Math.pow(monthlyRate, 12 - month) - 1) / (monthlyRate - 1) * Math.pow(monthlyRate, month - 6)
          + projectionData[i + 1].annualSavings / 12 * (Math.pow(monthlyRate, month) - 1) / (monthlyRate - 1) ;
      } else {
        cumulativeSavingsFromMonthly1 = previousCumulativeSavingsFromMonthly * (Math.pow(monthlyRate, 6) - 1) / (monthlyRate - 1) ;
      }
    }

    month += 6;
    if (month > 12) {
      month -= 12;
      year += 1;
    }

    const paddedMonth1 = month.toString().padStart(2, "0");
    const label1 = `${paddedMonth1}/${year}`;

    milestones.push({
      name: label1,
      cumulativeSavingsFromInitial: Math.round(cumulativeSavingsFromInitial1),
      cumulativeSavingsFromMonthly: Math.round(cumulativeSavingsFromMonthly1),
      cumulativeSavings: Math.round(cumulativeSavingsFromInitial1 + cumulativeSavingsFromMonthly1),
    });

    // === CỘT MỐC 2: 12 tháng cuối năm ===

    // Tính toán cho 12 tháng (dựa trên kết quả 6 tháng)
    const cumulativeSavingsFromInitial2 = cumulativeSavingsFromInitial1 * Math.pow(monthlyRate, 6);
    let cumulativeSavingsFromMonthly2 = 0;

    if (month > 6) {
      cumulativeSavingsFromMonthly2 = cumulativeSavingsFromMonthly1 * Math.pow(monthlyRate, 6) 
        + projectionData[i].annualSavings / 12 * (Math.pow(monthlyRate, 12 - month) - 1) / (monthlyRate - 1) * Math.pow(monthlyRate, month - 6)
        + projectionData[i + 1].annualSavings / 12 * (Math.pow(monthlyRate, month - 6) - 1) / (monthlyRate - 1) ;
    } else {
      cumulativeSavingsFromMonthly2 = cumulativeSavingsFromMonthly1 * Math.pow(monthlyRate, 6)  +  projectionData[i + 1].annualSavings / 12 * (Math.pow(monthlyRate, 6) - 1) / (monthlyRate - 1) ;
    }

      month += 6;
      if (month > 12) {
        month -= 12;
        year += 1;
      }
      const paddedMonth2 = month.toString().padStart(2, "0");
      const label2 = `${paddedMonth2}/${year}`;

    milestones.push({
      name: label2,
      cumulativeSavingsFromInitial: Math.round(cumulativeSavingsFromInitial2),
      cumulativeSavingsFromMonthly: Math.round(cumulativeSavingsFromMonthly2),
      cumulativeSavings: Math.round(cumulativeSavingsFromMonthly2 + cumulativeSavingsFromInitial2),
    });

    console.log("cumulativeSavingsFromInitial2", cumulativeSavingsFromInitial2)
    console.log("cumulativeSavingsFromMonthly2", cumulativeSavingsFromMonthly2)

    // Cập nhật kết quả cho năm tiếp theo
    previousCumulativeSavingsFromInitial = projectionData[i + 1].cumulativeSavingsFromInitial;
    previousCumulativeSavingsFromMonthly = projectionData[i + 1].cumulativeSavingsFromMonthly;
  }

  return milestones;
}
