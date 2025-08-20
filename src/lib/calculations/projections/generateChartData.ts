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

  // Dữ liệu đầu vào phải có ít nhất trạng thái ban đầu và một năm dự phóng.
  if (projectionData.length < 2) {
    return [];
  }

  // Cột mốc đầu tiên ("Hiện tại") chính là dữ liệu đầu tiên trong chuỗi dự phóng.
  const initialState = projectionData[0];
  milestones.push({
    name: "Hiện tại",
    cumulativeSavingsFromInitial: Math.round(initialState.cumulativeSavingsFromInitial),
    cumulativeSavingsFromMonthly: Math.round(initialState.cumulativeSavingsFromMonthly),
    cumulativeSavings: Math.round(initialState.cumulativeSavings),
  });

  const baseYear = initialState.year;

  // Lặp qua từng năm trong dữ liệu dự phóng.
  // Bắt đầu từ 1 vì projectionData[0] là trạng thái ban đầu, không phải cuối một năm.
  for (let i = 1; i < projectionData.length; i++) {
    // Dữ liệu tại thời điểm bắt đầu năm (tức là cuối năm trước).
    const startOfYearData = projectionData[i - 1]; 
    // Dữ liệu tại thời điểm kết thúc năm - đây là "điểm neo" của chúng ta.
    const endOfYearData = projectionData[i]; 

    // Lấy các thông số tài chính áp dụng cho năm hiện tại.
    const annualReturnRate = endOfYearData.pctInvestmentReturn / 100;
    const monthlySavings = endOfYearData.annualSavings / 12;

    // Tính toán lãi suất và hệ số nhân hàng tháng, xử lý trường hợp lãi suất bằng 0.
    const hasReturn = annualReturnRate > 0;
    const monthlyMultiplier = hasReturn ? Math.pow(1 + annualReturnRate, 1 / 12) : 1;
    const monthlyRate = hasReturn ? monthlyMultiplier - 1 : 0;

    // === CỘT MỐC 1: 6 tháng giữa năm (Tháng 6) ===
    
    // Tính toán tăng trưởng của vốn ban đầu từ đầu năm đến giữa năm.
    const midYearInitial = startOfYearData.cumulativeSavingsFromInitial * Math.pow(monthlyMultiplier, 6);
    
    // Tính toán tăng trưởng của các khoản tiết kiệm hàng tháng đã có từ trước.
    const midYearMonthlyFromPrevious = startOfYearData.cumulativeSavingsFromMonthly * Math.pow(monthlyMultiplier, 6);

    // Tính giá trị tương lai của các khoản tiết kiệm mới được thêm vào trong 6 tháng đầu năm.
    const newSavingsFv6Months = monthlyRate > 0
      ? monthlySavings * (Math.pow(monthlyMultiplier, 6) - 1) / monthlyRate
      : monthlySavings * 6;
    
    const midYearMonthlyTotal = midYearMonthlyFromPrevious + newSavingsFv6Months;
    
    milestones.push({
      name: `06/${baseYear + i}`,
      cumulativeSavingsFromInitial: Math.round(midYearInitial),
      cumulativeSavingsFromMonthly: Math.round(midYearMonthlyTotal),
      cumulativeSavings: Math.round(midYearInitial + midYearMonthlyTotal),
    });

    // === CỘT MỐC 2: Cuối năm (Tháng 12) ===
    
    // Để đảm bảo khớp 100%, ta sử dụng trực tiếp dữ liệu đã tính sẵn từ generateProjections.
    milestones.push({
      name: `12/${baseYear + i}`,
      cumulativeSavingsFromInitial: Math.round(endOfYearData.cumulativeSavingsFromInitial),
      cumulativeSavingsFromMonthly: Math.round(endOfYearData.cumulativeSavingsFromMonthly),
      cumulativeSavings: Math.round(endOfYearData.cumulativeSavings),
    });
  }

  return milestones;
}
