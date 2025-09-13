import { PlanWithDetails } from "./generateProjections";

// Giao diện ChartMilestone giữ nguyên, rất linh hoạt
export interface ChartMilestone {
  name: string; // Trục X, thường là năm
  value: number; // Trục Y, giá trị của dữ liệu cần vẽ
}

// Kiểu dữ liệu cho các key có thể vẽ biểu đồ, khớp với chartDataKey trong Assumption.tsx
type DataKey = 'pctSalaryGrowth' | 'pctHouseGrowth' | 'pctInvestmentReturn';

/**
 * Tạo ra một chuỗi dữ liệu đơn giản để vẽ biểu đồ minh họa sự tăng trưởng của một biến số duy nhất.
 * Hàm này KHÔNG chạy lại toàn bộ engine tính toán, do đó rất nhanh.
 */
export function generateAccumulationMilestones(
  plan: PlanWithDetails, // Nhận plan để lấy giá trị ban đầu và % tăng trưởng
  dataKey: DataKey
): ChartMilestone[] {
  const milestones: ChartMilestone[] = [];
  const currentYear = new Date().getFullYear();
  const numberOfYears = 15; // Minh họa cho 15 năm tới

  let initialValue = 0;
  let growthRate = 0;

  // Lấy giá trị ban đầu và % tăng trưởng tương ứng với dataKey
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
      // Để minh họa, ta chỉ tính sự tăng trưởng của khoản tiết kiệm ban đầu.
      // Điều này không hoàn toàn chính xác nhưng đủ để người dùng thấy tác động của % lợi nhuận đầu tư.
      initialValue = plan.initialSavings || 0;
      growthRate = plan.pctInvestmentReturn || 0;
      break;
  }

  let currentValue = initialValue;
  // Vòng lặp để tính toán giá trị cho mỗi năm trong tương lai
  for (let i = 0; i <= numberOfYears; i++) {
    const year = currentYear + i;
    milestones.push({
      name: `${year}`,
      value: Math.round(currentValue),
    });
    // Tính giá trị cho năm tiếp theo
    currentValue *= (1 + growthRate / 100);
  }

  return milestones;
}
