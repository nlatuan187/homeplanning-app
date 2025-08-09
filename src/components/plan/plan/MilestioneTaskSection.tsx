// components/MilestoneTaskSection.tsx
"use client";

import React, { useState, useEffect } from "react";
import TodoList from "./TodoList";
import { TaskType } from "./TodoItem";
import { Plan } from "@prisma/client";
import { getCustomTasks } from "@/actions/milestoneProgress";

interface MilestoneTaskSectionProps {
  milestoneId: number;
  planId: string;
  plan?: Plan; // Thêm plan data
  onSavingsUpdate?: (amount: number) => void;
  onMilestoneCompleted?: () => void;
  isMilestoneCompleted?: boolean;
  accumulationMax?: number; // Thêm để tính toán interest amount
  accumulationMin?: number; // Thêm để tính toán interest amount
}

// Function để tạo tasks với giá trị thực từ plan
function generateTasksFromPlan(
  milestoneId: number, 
  plan?: Plan,
  accumulationMax?: number,
  accumulationMin?: number
): { text: string; type: TaskType; status: "incomplete" | "completed" | "auto-completed"; amount?: number }[] {
  
  if (!plan) return [];
  
  // Tính toán các giá trị từ plan (đơn vị: triệu)
  const monthlyExpenses = (plan.monthlyLivingExpenses + (plan.monthlyNonHousingDebt || 0));
  const monthlyIncome = (plan.userMonthlyIncome + (plan.hasCoApplicant ? (plan.coApplicantMonthlyIncome || 0) : 0));
  const monthlyOtherIncome = (plan.monthlyOtherIncome || 0);
  const investmentReturn = plan.pctInvestmentReturn || 0;
  
  // Format giá trị hiển thị (đơn vị triệu)
  const monthlyExpensesText = monthlyExpenses.toLocaleString() + " triệu";
  const monthlyIncomeText = monthlyIncome.toLocaleString() + " triệu";
  const monthlyOtherIncomeText = monthlyOtherIncome.toLocaleString() + " triệu";
  const investmentReturnText = (investmentReturn * 100).toFixed(1) + "%";
  
  // Tính toán các giá trị phức tạp (đơn vị triệu)
  const milestoneTimespan = 6; // tháng
  const totalExpensesForPeriod = monthlyExpenses * milestoneTimespan;
  const emergencyFund = monthlyExpenses * 2;
  const expectedInvestmentReturn = ((plan.initialSavings || 0)) * investmentReturn * (milestoneTimespan / 12);
  
  // Tính toán interest amount theo công thức yêu cầu
  const monthlySavings = monthlyIncome - monthlyExpenses;
  let interestAmount = 0;
  let estimateTime = 0;
  
  if (accumulationMax !== undefined && accumulationMin !== undefined && monthlySavings > 0) {
    const targetAmount = accumulationMax - accumulationMin;
    estimateTime = Math.floor(targetAmount / monthlySavings);
    interestAmount = targetAmount - (monthlySavings * estimateTime);
  }
  
  // Item mới được thêm vào tất cả các milestone
  const newInterestItem = {
    text: "Tiền lãi được nhận thêm nhờ tích lũy",
    type: "system" as const,
    status: "incomplete" as const,
    amount: interestAmount
  };

  const tasksByMilestone: Record<number, { text: string; type: TaskType; status: "incomplete" | "completed" | "auto-completed"; amount?: number }[]> = {
    1: [
      newInterestItem, // Thêm item mới
      { text: "Chọn phương pháp ghi chép dòng tiền của gia đình để theo dõi trong dài hạn (excel, ứng dụng theo dõi,...)", type: "system", status: "incomplete" },
      { text: "Ghi chép đầy đủ về các khoản chi tiêu hàng ngày, phân loại theo 3 nhóm Thiết yếu - Giải trí - Khác", type: "system", status: "incomplete" },
      { text: "Ghi chép đầy đủ về các khoản thu: lương tháng, các nguồn thu nhập khác, tiền lãi đầu tư, tiền tiết kiệm,...", type: "system", status: "incomplete" },
      { text: "Cuối tháng đối chiếu tổng chi, tổng thu với số tiền đã input lúc đầu", type: "system", status: "incomplete" },
      { text: `Chi tiêu gia đình không vượt quá ${monthlyExpensesText}`, type: "system", status: "incomplete", amount: -monthlyExpenses }, // Quay lại âm
      { text: `Thu nhập từ lương của gia đình đạt ${monthlyIncomeText}`, type: "system", status: "incomplete", amount: monthlyIncome },
      ...(monthlyOtherIncome > 0 ? [{ text: `Thu nhập từ công việc phụ đạt ${monthlyOtherIncomeText}`, type: "system" as const, status: "incomplete" as const, amount: monthlyOtherIncome }] : []),
    ],
    
    2: [
      newInterestItem, // Thêm item mới
      { text: "Rà soát lại các khoản chi bất hợp lý trong từng nhóm hoặc điều chỉnh tỷ lệ chi cho các nhóm nếu có sự không phù hợp", type: "system", status: "incomplete" },
      { text: "Đối chiếu số liệu thu nhập, chi tiêu với tháng thứ nhất và với thông tin input để đảm bảo không có sai số quá lớn", type: "system", status: "incomplete" },
      { text: "Mở một tài khoản dự phòng riêng biệt, có tính thanh khoản cao", type: "system", status: "incomplete" },
      { text: `Trích từ tài khoản tiết kiệm hoặc thu nhập hàng tháng ${monthlyExpensesText} để gửi vào tài khoản dự phòng`, type: "system", status: "incomplete", amount: -monthlyExpenses },
      { text: `Chi tiêu gia đình không vượt quá ${monthlyExpensesText}`, type: "system", status: "incomplete", amount: -monthlyExpenses }, // Quay lại âm
      { text: `Thu nhập từ lương của gia đình đạt ${monthlyIncomeText}`, type: "system", status: "incomplete", amount: monthlyIncome },
      ...(monthlyOtherIncome > 0 ? [{ text: `Thu nhập từ công việc phụ đạt ${monthlyOtherIncomeText}`, type: "system" as const, status: "incomplete" as const, amount: monthlyOtherIncome }] : []),
    ],
    
    3: [
      newInterestItem, // Thêm item mới
      { text: `Duy trì chi tiêu ở mức ${monthlyExpensesText} mỗi tháng. Nghĩa là trong cột mốc này cần đảm bảo chi tiêu dao động ${totalExpensesForPeriod.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: -totalExpensesForPeriod }, // Quay lại âm
      { text: `Duy trì mức lương hàng tháng ${monthlyIncomeText}`, type: "system", status: "incomplete", amount: monthlyIncome * milestoneTimespan },
      { text: `Mang tiền tiết kiệm đi đầu tư với tỷ lệ lợi nhuận ${investmentReturnText}, đảm bảo thu nhập từ đầu tư nằm trong khoảng ${expectedInvestmentReturn.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: expectedInvestmentReturn },
      { text: `Bổ sung thêm ${emergencyFund.toLocaleString()} triệu (tương đương 2 tháng chi tiêu) vào quỹ dự phòng để tạo được quỹ dự phòng trị giá 3 tháng chi phí của gia đình`, type: "system", status: "incomplete", amount: -emergencyFund },
    ],
    
    4: [
      newInterestItem, // Thêm item mới
      { text: `Duy trì chi tiêu ở mức ${monthlyExpensesText} mỗi tháng. Nghĩa là trong cột mốc này cần đảm bảo chi tiêu dao động ${totalExpensesForPeriod.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: -totalExpensesForPeriod }, // Quay lại âm
      { text: `Nếu không thể tăng lương, đề xuất tìm kiếm công việc làm thêm để kiếm thêm ít nhất ${(monthlyIncome * 0.1).toLocaleString()} triệu (freelance, dạy thêm,...)`, type: "system", status: "incomplete", amount: monthlyIncome * 0.1 },
      { text: `Mang tiền tiết kiệm đi đầu tư với tỷ lệ lợi nhuận ${investmentReturnText}, đảm bảo thu nhập từ đầu tư nằm trong khoảng ${expectedInvestmentReturn.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: expectedInvestmentReturn },
      { text: "Làm việc với tư vấn bất động sản để lựa chọn căn nhà mong muốn", type: "system", status: "incomplete" },
      { text: "Chuẩn bị đầy đủ giấy tờ: Hợp đồng lao động, sao kê, sao kê thu nhập phụ", type: "system", status: "incomplete" },
      { text: "Chốt ngân hàng vay, so sánh các phương án pre-approved", type: "system", status: "incomplete" },
      { text: "Nhờ tư vấn pháp lý kiểm tra kỹ hồ sơ vay trước khi ký gửi", type: "system", status: "incomplete" },
    ],
    
    5: [
      newInterestItem, // Thêm item mới
      { text: `Duy trì chi tiêu ở mức ${monthlyExpensesText} mỗi tháng. Nghĩa là trong cột mốc này cần đảm bảo chi tiêu dao động ${totalExpensesForPeriod.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: -totalExpensesForPeriod }, // Quay lại âm
      { text: `Nếu không thể tăng lương, đề xuất tìm kiếm công việc làm thêm để kiếm thêm ít nhất ${(monthlyIncome * 0.1).toLocaleString()} triệu (freelance, dạy thêm,...)`, type: "system", status: "incomplete", amount: monthlyIncome * 0.1 },
      { text: `Mang tiền tiết kiệm đi đầu tư với tỷ lệ lợi nhuận ${investmentReturnText}, đảm bảo thu nhập từ đầu tư nằm trong khoảng ${expectedInvestmentReturn.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: expectedInvestmentReturn },
      { text: "Chuyển đổi toàn bộ tiền tích lũy về tiền mặt hoặc gửi vào tài khoản thanh toán có thể rút ngay", type: "system", status: "incomplete" },
      { text: "Làm việc với bên ngân hàng để giải ngân, rút tiền vay", type: "system", status: "incomplete" },
      { text: "Thực hiện giao dịch mua nhà", type: "system", status: "incomplete" },
    ],
  };
  
  return tasksByMilestone[milestoneId] || [];
}

export default function MilestoneTaskSection({ 
  milestoneId, 
  planId,
  plan,
  onSavingsUpdate, 
  onMilestoneCompleted, 
  isMilestoneCompleted = false,
  accumulationMax,
  accumulationMin
}: MilestoneTaskSectionProps) {
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load tasks khi component mount
  useEffect(() => {
    async function loadTasks() {
      try {
        // Lấy system tasks
        const systemTasks = generateTasksFromPlan(milestoneId, plan, accumulationMax, accumulationMin);
        
        // Lấy custom tasks từ database
        const customTasks = await getCustomTasks(planId, milestoneId);
        
        // Merge tasks
        const mergedTasks = [
          ...systemTasks,
          ...customTasks.map((task: any) => ({
            text: task.text,
            type: task.type,
            status: task.status,
            amount: task.amount,
            id: task.id, // Thêm ID để tracking
            isCustom: true, // Flag để phân biệt
          }))
        ];
        
        setAllTasks(mergedTasks);
      } catch (error) {
        console.error("Error loading tasks:", error);
        // Fallback to system tasks only
        setAllTasks(generateTasksFromPlan(milestoneId, plan, accumulationMax, accumulationMin));
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTasks();
  }, [milestoneId, planId, plan, accumulationMax, accumulationMin]);
  
  // Nếu milestone đã hoàn thành, tất cả tasks sẽ có status "auto-completed"
  const tasksWithStatus = isMilestoneCompleted 
    ? allTasks.map(task => ({ ...task, status: "auto-completed" as const }))
    : allTasks;
  
  if (isLoading) {
    return <div className="p-4">Loading tasks...</div>;
  }
    
  return (
    <div className="p-4">
      <TodoList
        milestoneId={milestoneId}
        planId={planId}
        defaultItems={tasksWithStatus}
        onSavingsUpdate={onSavingsUpdate}
        onMilestoneCompleted={onMilestoneCompleted}
        isMilestoneCompleted={isMilestoneCompleted}
        plan={plan}
        currentMilestoneAmount={accumulationMax}
        previousMilestoneAmount={accumulationMin}
      />
    </div>
  );
}
