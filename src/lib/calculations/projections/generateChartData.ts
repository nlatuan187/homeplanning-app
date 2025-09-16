import { PlanWithDetails } from "./generateProjections";

// Giao diện ChartMilestone giữ nguyên, rất linh hoạt
export interface ChartMilestone {
  name: string; // Trục X, thường là năm
  value: number; // Trục Y, giá trị của dữ liệu cần vẽ
}

// Kiểu dữ liệu cho các key có thể vẽ biểu đồ, khớp với chartDataKey trong Assumption.tsx
type DataKey = 'pctSalaryGrowth' | 'pctHouseGrowth' | 'initialSavings';

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
    case 'initialSavings':
      // Minh họa sự tăng trưởng của khoản tiết kiệm ban đầu
      initialValue = plan.initialSavings || 0;
      growthRate = plan.initialSavings || 0;
      break;
  }

  // 4. Lặp qua các năm cần hiển thị và tính toán giá trị
  for (let year = startYear; year <= endYear; year++) {
    // Bỏ qua các năm trong quá khứ, biểu đồ chỉ bắt đầu từ năm hiện tại
    if (year < currentYear) {
      continue;
    }

    // Tính số năm đã trôi qua kể từ năm hiện tại
    const yearsPassed = year - currentYear;

    // Tính giá trịท gộp cho năm tương ứng bằng công thức lãi kép
    const currentValue = initialValue * Math.pow(1 + growthRate / 100, yearsPassed);

    milestones.push({
      name: `${year}`,
      value: Math.round(currentValue),
    });
  }

  return milestones;
}
