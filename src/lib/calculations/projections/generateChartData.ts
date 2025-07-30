export type ChartMilestone = {
  name: string; // Ví dụ: "6/2026" hoặc "Hiện tại"
  cumulativeSavingsFromInitial: number;
  cumulativeSavingsFromMonthly: number;
  cumulativeSavings: number;
};

import { ProjectionRow } from "@/lib/calculations/affordability";
import { Plan } from "@prisma/client";

export function generateAccumulationMilestones(
  projectionData: ProjectionRow[],
  plan: Plan,
): ChartMilestone[] {
  const milestones: ChartMilestone[] = [];

  const baseDate = plan.createdAt ? new Date(plan.createdAt) : new Date();
  let month = baseDate.getMonth() + 1;
  let year = baseDate.getFullYear();

  const confirmedPurchaseYear = plan.confirmedPurchaseYear ?? year;
  const length = (confirmedPurchaseYear - year) * 2 + 1;

  for (let i = 0; i < length && i < projectionData.length; i++) {
    const p = projectionData[i];
    let label = "";

    if (i === 0) {
      label = "Hiện tại";
    } else {
      month += 6;
      if (month > 12) {
        month -= 12;
        year += 1;
      }
      // Đảm bảo 2 chữ số cho tháng
      const paddedMonth = month.toString().padStart(2, "0");
      label = `${paddedMonth}/${year}`;
    }

    milestones.push({
      name: label,
      cumulativeSavingsFromInitial: Math.round(p.cumulativeSavingsFromInitial ?? 0),
      cumulativeSavingsFromMonthly: Math.round(p.cumulativeSavingsFromMonthly ?? 0),
      cumulativeSavings: Math.round(p.cumulativeSavings ?? 0),
    });
  }

  return milestones;
}
