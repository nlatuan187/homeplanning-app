import { PlanWithDetails } from "./generateProjections";
import { ProjectionRow } from "../affordability";

export interface ChartMilestone {
  name: string,
  cumulativeSavings: number,
  housePriceProjected: number,
  primaryIncome: number,
}

export function generateAccumulationMilestones(
  projectionData: ProjectionRow[],
  plan: PlanWithDetails,
): ChartMilestone[] {
  const milestones: ChartMilestone[] = [];

  if (projectionData.length < 1) {
    return [];
  }

  // Chỉ hiển thị các năm cho đến năm mục tiêu (firstViableYear)
  const targetYear = plan.firstViableYear || projectionData[projectionData.length - 1].year;
  const filteredProjections = projectionData.filter(p => p.year <= targetYear - 1);

  // Lặp qua dữ liệu đã lọc để tạo các cột mốc hàng năm.
  for (const yearData of filteredProjections) {
      milestones.push({
        name: `${yearData.year}`,
        cumulativeSavings: Math.round(yearData.cumulativeSavings),
        housePriceProjected: Math.round(yearData.housePriceProjected),
        primaryIncome: Math.round(yearData.primaryIncome),
      });
  }

  return milestones;
}
