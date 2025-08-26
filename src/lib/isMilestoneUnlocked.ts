import { Plan } from "@prisma/client";
import { generateProjections } from "./calculations/projections/generateProjections";

// Định nghĩa interface cho Milestone
export interface Milestone {
  title: string;
  status: "done" | "current" | "upcoming";
  goalNumber: number;
  checklist: number[];
  icon?: string;
  amountValue?: number | null;
}

// Định nghĩa interface cho các task trong một milestone con
export interface MilestoneTask {
  text: string;
  type: string;
  status: string;
  amount?: number;
}

// Định nghĩa interface mới cho MilestoneGroup theo yêu cầu
export interface MilestoneGroup {
  id: number;
  title: string;
  status: "done" | "current" | "upcoming";
  milestones: {
    groupId: number;
    status: "done" | "current" | "upcoming";
    amountValue: number;
    items: MilestoneTask[]; // Thêm thuộc tính 'items' vào đây
    monthlySurplus: number; // Thêm thuộc tính 'monthlySurplus'
  }[];
}

// Định nghĩa các milestone theo thứ tự Goal 1-11
const milestoneDefinitions: Record<
  "under1" | "under2" | "over2",
  { goalNumber: number; checklist: number[] }[]
> = {
  under1: [
    { goalNumber: 1, checklist: [1, 2] },
    { goalNumber: 2, checklist: [3, 4] },
    { goalNumber: 3, checklist: [5, 6] },
    { goalNumber: 4, checklist: [7, 8] },
    { goalNumber: 5, checklist: [9, 10] },
    { goalNumber: 6, checklist: [11, 12] },
  ],
  under2: [
    { goalNumber: 1, checklist: [1, 2, 3] },
    { goalNumber: 2, checklist: [4, 5, 6] },
    { goalNumber: 3, checklist: [7, 8, 9] },
    { goalNumber: 4, checklist: [10, 11, 12] },
    { goalNumber: 5, checklist: [13, 14, 15] },
    { goalNumber: 6, checklist: [16, 17, 18] },
    { goalNumber: 7, checklist: [19, 20, 21] },
    { goalNumber: 8, checklist: [22, 23, 24] },
  ],
  over2: [
    { goalNumber: 1, checklist: [1, 2, 3] },
    { goalNumber: 2, checklist: [4, 5, 6] },
    { goalNumber: 3, checklist: [7, 8, 9] },
    { goalNumber: 4, checklist: [10, 11, 12] },
    { goalNumber: 5, checklist: [13, 14, 15] },
    { goalNumber: 6, checklist: [16, 17, 18] },
    { goalNumber: 7, checklist: [19, 20, 21] },
    { goalNumber: 8, checklist: [22, 23, 24] },
    { goalNumber: 9, checklist: [25, 26, 27] },
    { goalNumber: 10, checklist: [28, 29, 30] },
    { goalNumber: 11, checklist: [31, 32, 33] },
    { goalNumber: 12, checklist: [34, 35, 36] },
  ],
};

// Định nghĩa cấu trúc nhóm cho từng trường hợp
// Mỗi groupId sẽ chứa các checklistNumber tương ứng với các itemTask
const groupStructures: Record<
  "under1" | "under2" | "over2",
  { groupId: number; checklistNumbers: number[] }[]
> = {
  under1: [
    { groupId: 1, checklistNumbers: [1] },
    { groupId: 2, checklistNumbers: [2] },
    { groupId: 3, checklistNumbers: [3, 4, 5, 6, 7] },
    { groupId: 4, checklistNumbers: [8, 9] },
    { groupId: 5, checklistNumbers: [10, 11] },
    { groupId: 6, checklistNumbers: [12] },
  ],
  under2: [
    { groupId: 1, checklistNumbers: [1] },
    { groupId: 2, checklistNumbers: [2] },
    { groupId: 3, checklistNumbers: [3, 4, 5, 6, 7, 8, 9] },
    { groupId: 4, checklistNumbers: [10, 11, 12, 13, 14, 15] },
    { groupId: 5, checklistNumbers: [16, 17, 18, 19, 20, 21] },
    { groupId: 6, checklistNumbers: [22, 23, 24] },
  ],
  over2: [
    { groupId: 1, checklistNumbers: [1] },
    { groupId: 2, checklistNumbers: [2] },
    { groupId: 3, checklistNumbers: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] },
    { groupId: 4, checklistNumbers: [24, 25, 26, 27, 28] },
    { groupId: 5, checklistNumbers: [29, 30, 31, 32] },
    { groupId: 6, checklistNumbers: [33, 34, 35, 36] },
  ],
};

// SỬA BƯỚC 1: Tái cấu trúc hàm để nhận các giá trị đã được tính toán trước
function getItemsByGroupId(
  groupId: number,
  plan: Plan,
  monthlyIncome: number,
  monthlyExpenses: number,
  monthlyInvestmentReturn: number,
  monthlyOtherIncome: number
): { text: string; type: string; status: string; amount?: number }[] {
  if (!plan) return [];

  const milestoneTimespan = 1; // Mỗi cột mốc là 1 tháng
  const totalExpensesForPeriod = monthlyExpenses * milestoneTimespan;
  const emergencyFund = monthlyExpenses;

  const itemsByGroup: Record<
    number,
    { text: string; type: string; status: string; amount?: number }[]
  > = {
    1: [
      {
        text: "Chọn phương pháp ghi chép dòng tiền của gia đình để theo dõi trong dài hạn (excel, ứng dụng theo dõi,...)",
        type: "system",
        status: "incomplete",
      },
      {
        text: "Ghi chép đầy đủ về các khoản chi tiêu hàng ngày, phân loại theo 3 nhóm Thiết yếu - Giải trí - Khác",
        type: "system",
        status: "incomplete",
      },
      {
        text: "Ghi chép đầy đủ về các khoản thu: lương tháng, các nguồn thu nhập khác, tiền lãi đầu tư, tiền tiết kiệm,...",
        type: "system",
        status: "incomplete",
      },
      {
        text: "Cuối tháng đối chiếu tổng chi, tổng thu với số tiền đã input lúc đầu",
        type: "system",
        status: "incomplete",
      },
      {
        text: `Chi tiêu gia đình không vượt quá ${monthlyExpenses.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
        type: "system",
        status: "incomplete",
        amount: -monthlyExpenses,
      },
      {
        text: `Thu nhập chính của gia đình đạt ${(monthlyIncome - monthlyOtherIncome).toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
        type: "system",
        status: "incomplete",
        amount: monthlyIncome - monthlyOtherIncome,
      },
      ...(monthlyOtherIncome > 0
        ? [
            {
              text: `Thu nhập từ công việc phụ đạt ${monthlyOtherIncome.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
              type: "system",
              status: "incomplete",
              amount: monthlyOtherIncome,
            },
          ]
        : []),
      {
        text: `Mang tiền tiết kiệm đi tích lũy với lợi nhuận ${plan.pctInvestmentReturn}%`,
        type: "system",
        status: "incomplete",
        amount: monthlyInvestmentReturn,
      },
    ],

    2: [
      {
        text: "Rà soát lại các khoản chi bất hợp lý trong từng nhóm hoặc điều chỉnh tỷ lệ chi cho các nhóm nếu có sự không phù hợp",
        type: "system",
        status: "incomplete",
      },
      {
        text: "Đối chiếu số liệu thu nhập, chi tiêu với tháng thứ nhất và với thông tin input để đảm bảo không có sai số quá lớn",
        type: "system",
        status: "incomplete",
      },
      {
        text: "Mở một tài khoản dự phòng riêng biệt, có tính thanh khoản cao",
        type: "system",
        status: "incomplete",
      },
      {
        text: `Chi tiêu gia đình không vượt quá ${monthlyExpenses.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
        type: "system",
        status: "incomplete",
        amount: -monthlyExpenses,
      },
      {
        text: `Thu nhập chính của gia đình đạt ${(monthlyIncome - monthlyOtherIncome).toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
        type: "system",
        status: "incomplete",
        amount: monthlyIncome - monthlyOtherIncome,
      },
      ...(monthlyOtherIncome > 0
        ? [
            {
              text: `Thu nhập từ công việc phụ đạt ${monthlyOtherIncome.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
              type: "system",
              status: "incomplete",
              amount: monthlyOtherIncome,
            },
          ]
        : []),
      {
        text: `Bỏ ra 1 khoản ${monthlyIncome - monthlyOtherIncome - monthlyExpenses} triệu VNĐ dư ra sau khi chi tiêu từ thu nhập vào khoản tích lũy ban đầu`,
        type: "system", 
        status: "incomplete",
        amount: monthlyInvestmentReturn,
      },
    ],

    3: [
      {
        text: `Duy trì chi tiêu ở mức ${monthlyExpenses.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu mỗi tháng. Nghĩa là trong cột mốc này cần đảm bảo chi tiêu dao động ${totalExpensesForPeriod.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
        type: "system",
        status: "incomplete",
        amount: -totalExpensesForPeriod,
      },
      {
        text: `Duy trì mức thu nhập hàng tháng ${(monthlyIncome - monthlyOtherIncome).toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
        type: "system",
        status: "incomplete",
        amount: (monthlyIncome - monthlyOtherIncome) * milestoneTimespan,
      },
       ...(monthlyOtherIncome > 0
        ? [
            {
              text: `Thu nhập từ công việc phụ đạt ${monthlyOtherIncome.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
              type: "system",
              status: "incomplete",
              amount: monthlyOtherIncome,
            },
          ]
        : []),
      {
        text: `Bỏ ra 1 khoản ${monthlyIncome - monthlyOtherIncome - monthlyExpenses} triệu VNĐ dư ra sau khi chi tiêu từ thu nhập vào khoản tích lũy ban đầu`,
        type: "system",
        status: "incomplete",
        amount: monthlyInvestmentReturn,
      },
    ],

    4: [
      {
        text: `Duy trì chi tiêu ở mức ${monthlyExpenses.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu mỗi tháng. Nghĩa là trong cột mốc này cần đảm bảo chi tiêu dao động ${totalExpensesForPeriod.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
        type: "system",
        status: "incomplete",
        amount: -totalExpensesForPeriod,
      },
      {
        text: `Duy trì mức thu nhập hàng tháng ${(monthlyIncome - monthlyOtherIncome).toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
        type: "system",
        status: "incomplete",
        amount: (monthlyIncome - monthlyOtherIncome) * milestoneTimespan,
      },
       ...(monthlyOtherIncome > 0
        ? [
            {
              text: `Thu nhập từ công việc phụ đạt ${monthlyOtherIncome.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
              type: "system",
              status: "incomplete",
              amount: monthlyOtherIncome,
            },
          ]
        : []),
      {
        text: `Nếu không thể tăng lương, đề xuất tìm kiếm công việc làm thêm để kiếm thêm ít nhất ${(monthlyIncome * 0.1).toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu (freelance, dạy thêm,...)`,
        type: "system",
        status: "incomplete",
        amount: monthlyIncome * 0.1,
      },
      {
        text: "Tìm hiểu tối thiểu sản phẩm của 3 công ty bảo hiểm và so sánh các gói",
        type: "system",
        status: "incomplete",
      },
      {
        text: "Nói chuyện với tư vấn viên để có được mức phí, thời gian đóng và điều khoản hợp lý",
        type: "system",
        status: "incomplete",
      },
      {
        text: "Ước tính chi phí dành cho bảo hiểm hàng tháng tương đương 5% thu nhập, nghĩa là khoảng [5% x thu nhập hàng năm] để chọn gói phù hợp",
        type: "system",
        status: "incomplete",
      },
      {
        text: `Bỏ ra 1 khoản ${monthlyIncome - monthlyOtherIncome - monthlyExpenses} triệu VNĐ dư ra sau khi chi tiêu từ thu nhập vào khoản tích lũy ban đầu`,
        type: "system",
        status: "incomplete",
        amount: monthlyInvestmentReturn,
      }
    ],

    5: [
      {
        text: `Duy trì chi tiêu ở mức ${monthlyExpenses.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu mỗi tháng. Nghĩa là trong cột mốc này cần đảm bảo chi tiêu dao động ${totalExpensesForPeriod.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
        type: "system",
        status: "incomplete",
        amount: -totalExpensesForPeriod,
      },
      {
        text: `Nếu không thể tăng lương, đề xuất tìm kiếm công việc làm thêm để kiếm thêm ít nhất ${(monthlyIncome * 0.1).toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu (freelance, dạy thêm,...)`,
        type: "system",
        status: "incomplete",
        amount: monthlyIncome * 0.1,
      },
      {
        text: "Làm việc với tư vấn bất động sản để lựa chọn căn nhà mong muốn",
        type: "system",
        status: "incomplete",
      },
      {
        text: "Chuẩn bị đầy đủ giấy tờ: Hợp đồng lao động, sao kê, sao kê thu nhập phụ",
        type: "system",
        status: "incomplete",
      },
      {
        text: "Chốt ngân hàng vay, so sánh các phương án pre-approved",
        type: "system",
        status: "incomplete",
      },
      {
        text: "Nhờ tư vấn pháp lý kiểm tra kỹ hồ sơ vay trước khi ký gửi",
        type: "system",
        status: "incomplete",
      },
      {
        text: `Bỏ ra 1 khoản ${monthlyIncome - monthlyOtherIncome - monthlyExpenses} triệu VNĐ dư ra sau khi chi tiêu từ thu nhập vào khoản tích lũy ban đầu`,
        type: "system",
        status: "incomplete",
        amount: monthlyInvestmentReturn,
      },
    ],

    6: [
      {
        text: `Duy trì chi tiêu ở mức ${monthlyExpenses.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu mỗi tháng. Nghĩa là trong cột mốc này cần đảm bảo chi tiêu dao động ${totalExpensesForPeriod.toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu`,
        type: "system",
        status: "incomplete",
        amount: -totalExpensesForPeriod,
      },
      {
        text: `Nếu không thể tăng lương, đề xuất tìm kiếm công việc làm thêm để kiếm thêm ít nhất ${(monthlyIncome * 0.1).toLocaleString("en-US", { maximumFractionDigits: 0 })} triệu (freelance, dạy thêm,...)`,
        type: "system",
        status: "incomplete",
        amount: monthlyIncome * 0.1,
      },
      {
        text: "Chuyển đổi toàn bộ tiền tích lũy về tiền mặt hoặc gửi vào tài khoản thanh toán có thể rút ngay",
        type: "system",
        status: "incomplete",
      },
      {
        text: "Làm việc với bên ngân hàng để giải ngân, rút tiền vay",
        type: "system",
        status: "incomplete",
      },
      {
        text: "Thực hiện giao dịch mua nhà",
        type: "system",
        status: "incomplete",
      },
      {
        text: `Bỏ ra 1 khoản ${monthlyIncome - monthlyOtherIncome - monthlyExpenses} triệu VNĐ dư ra sau khi chi tiêu từ thu nhập vào khoản tích lũy ban đầu`,
        type: "system",
        status: "incomplete",
        amount: monthlyInvestmentReturn,
      },
    ],
  };

  return itemsByGroup[groupId] || [];
}

export function getMilestonesByGroup(
  timeStart: number,
  confirmPurchaseYear: number,
  homePrice: number,
  currentSavings: number,
  plan: Plan
): MilestoneGroup[] {
  const duration = confirmPurchaseYear - timeStart;

  let groupKey: keyof typeof milestoneDefinitions;
  if (duration <= 1) groupKey = "under1";
  else if (duration <= 2) groupKey = "under2";
  else groupKey = "over2";

  const definitions = milestoneDefinitions[groupKey];
  const groupStructure = groupStructures[groupKey];

  // Lấy "Nguồn Chân Lý" từ generateProjections
  const projections = generateProjections(plan);

  // Bắt đầu mô phỏng theo tháng
  let currentSimulatedBalance = plan.initialSavings;
  const monthlyInvestmentRate =
    Math.pow(1 + plan.pctInvestmentReturn / 100, 1 / 12) - 1;

  const result: MilestoneGroup[] = [];

  let cumulativeMonthIndex = 0;

  for (
    let milestoneIndex = 0;
    milestoneIndex < definitions.length;
    milestoneIndex++
  ) {
    const def = definitions[milestoneIndex];
    const milestoneChecklistNumbers = def.checklist;

    const milestones = [];

    for (
      let milestoneInGroupIndex = 0;
      milestoneInGroupIndex < milestoneChecklistNumbers.length;
      milestoneInGroupIndex++
    ) {
      const checklistNumber = milestoneChecklistNumbers[milestoneInGroupIndex];

      const correspondingGroup = groupStructure.find((group) =>
        group.checklistNumbers.includes(checklistNumber)
      );
      const groupId = correspondingGroup ? correspondingGroup.groupId : checklistNumber;

      // 1. Xác định các tham số của tháng hiện tại
      const totalMonthsOffset = plan.createdAt.getMonth() + cumulativeMonthIndex;
      const yearOffset = Math.floor(totalMonthsOffset / 12);
      const projectionForThisYear =
        projections[yearOffset] || projections[projections.length - 1];

      if (!projectionForThisYear) {
        console.error(`Không tìm thấy projection cho yearOffset: ${yearOffset}`);
        // Fallback an toàn: có thể dừng lại hoặc dùng projection cuối cùng
        continue;
      }

      // 2. Tính toán các thành phần tăng trưởng
      const monthlyTotalIncome = projectionForThisYear.annualIncome / 12;
      const monthlyExpenses = projectionForThisYear.annualExpenses / 12;
      const monthlyOtherIncome = projectionForThisYear.otherIncome / 12;

      const monthlyCashflowSavings = monthlyTotalIncome - monthlyExpenses;

      // Lãi được tính trên số dư cuối tháng trước
      const monthlyInvestmentReturn =
        Number((currentSimulatedBalance * monthlyInvestmentRate).toFixed(1));

      // 3. Tính toán amountValue mới và cập nhật số dư cho tháng sau
      const prevAmountValue = currentSimulatedBalance;
      const amountValue =
        currentSimulatedBalance +
        monthlyCashflowSavings +
        monthlyInvestmentReturn;
      currentSimulatedBalance = amountValue; // Cập nhật cho vòng lặp tiếp theo

      // 4. Lấy danh sách các item với dữ liệu đã được tính toán
      const items = getItemsByGroupId(
        groupId,
        plan,
        monthlyTotalIncome,
        monthlyExpenses,
        monthlyInvestmentReturn,
        monthlyOtherIncome
      );

      // Thêm các tác vụ cho quỹ dự phòng trong 6 tháng đầu tiên
      if (plan.hasCoApplicant && cumulativeMonthIndex < 6) {
        items.push({
          text: `Bổ sung thêm ${monthlyExpenses.toLocaleString("en-US", {
            maximumFractionDigits: 0,
          })} triệu vào quỹ dự phòng cho tháng thứ ${
            cumulativeMonthIndex + 1
          }`,
          type: "emergency_fund",
          status: "incomplete",
          amount: monthlyExpenses,
        });
      }

      // 5. Xác định trạng thái của milestone
      let status: "done" | "current" | "upcoming" = "upcoming";
      const startValue = prevAmountValue;
      const endValue = amountValue;

      if (currentSavings >= endValue) {
        status = "done";
      } else if (currentSavings >= startValue) {
        status = "current";
      }

      const milestone = {
        groupId,
        status,
        amountValue,
        items,
        monthlySurplus: projectionForThisYear.monthlySurplus, // <-- THÊM DÒNG NÀY
      };

      milestones.push(milestone);
      cumulativeMonthIndex++;
    }

    const milestoneGroup = {
      id: def.goalNumber,
      title: `Cột mốc số ${def.goalNumber}`,
      milestones,
      status: "upcoming" as const, // Sẽ được cập nhật ở dưới
    };

    result.push(milestoneGroup);
  }

  // Cập nhật lại trạng thái tổng thể của các group và milestone
  // Logic này đảm bảo chỉ có 1 milestone là "current"
  let isCurrentMilestoneFound = false;
  const finalResult = result.map((group) => {
    const updatedMilestones = group.milestones.map((milestone) => {
      let newStatus = milestone.status;
      if (newStatus === "current") {
        if (isCurrentMilestoneFound) {
          newStatus = "upcoming"; // Nếu đã tìm thấy 'current' rồi, tất cả các cái sau là 'upcoming'
        } else {
          isCurrentMilestoneFound = true;
        }
      }
      return { ...milestone, status: newStatus };
    });

    // Cập nhật status tổng thể của group
    let groupStatus: "done" | "current" | "upcoming" = "upcoming";
    const allDone = updatedMilestones.every(
      (milestone) => milestone.status === "done"
    );
    const hasCurrent = updatedMilestones.some(
      (milestone) => milestone.status === "current"
    );

    if (allDone) {
      groupStatus = "done";
    } else if (hasCurrent) {
      groupStatus = "current";
    }

    return {
      ...group,
      milestones: updatedMilestones,
      status: groupStatus,
    };
  });

  return finalResult;
}

// Helper functions để xử lý milestone groups mới
export function updateMilestoneStatuses(milestoneGroups: MilestoneGroup[], currentSavings: number): MilestoneGroup[] {
  // Flatten tất cả milestones để sắp xếp theo amountValue
  const allMilestones = milestoneGroups.flatMap(group => 
    group.milestones.map(milestone => ({
      ...milestone,
      groupId: group.id,
      groupTitle: group.title
    }))
  );
  
  // Sắp xếp theo amountValue để đảm bảo thứ tự đúng
  const sortedMilestones = allMilestones.sort((a, b) => a.amountValue - b.amountValue);
  
  // Tìm milestone đầu tiên có amountValue > currentSavings
  const firstIncompleteMilestone = sortedMilestones.find(milestone => 
    milestone.amountValue > currentSavings
  );
  
  // Cập nhật status cho tất cả milestones
  const updatedMilestones = sortedMilestones.map(milestone => {
    if (currentSavings >= milestone.amountValue) {
      return { ...milestone, status: "done" as const };
    } else if (milestone === firstIncompleteMilestone) {
      return { ...milestone, status: "current" as const };
    } else {
      return { ...milestone, status: "upcoming" as const };
    }
  });
  
  // Cập nhật lại milestoneGroups với trạng thái mới
  const finalResult = milestoneGroups.map(group => {
    const updatedGroupMilestones = group.milestones.map(groupMilestone => {
      // Tìm milestone tương ứng trong updatedMilestones
      const updatedMilestone = updatedMilestones.find(m => 
        m.groupId === groupMilestone.groupId && 
        m.amountValue === groupMilestone.amountValue
      );
      
      return updatedMilestone || groupMilestone;
    });

    // Cập nhật status tổng thể của group
    let groupStatus: "done" | "current" | "upcoming" = "upcoming";
    const allDone = updatedGroupMilestones.every(milestone => milestone.status === "done");
    const hasCurrent = updatedGroupMilestones.some(milestone => milestone.status === "current");
    
    if (allDone) {
      groupStatus = "done";
    } else if (hasCurrent) {
      groupStatus = "current";
    }

    return {
      ...group,
      milestones: updatedGroupMilestones,
      status: groupStatus,
    };
  });

  return finalResult;
}

export function getCurrentMilestoneFromGroups(milestoneGroups: MilestoneGroup[]): { id: number; title: string; status: string; amountValue?: number } | null {
  for (const group of milestoneGroups) {
    const currentMilestone = group.milestones.find(m => m.status === "current");
    if (currentMilestone) {
      return {
        id: group.id,
        title: group.title,
        status: group.status,
        amountValue: currentMilestone.amountValue,
      };
    }
  }
  return null;
}

export function getMainMilestonesFromGroups(milestoneGroups: MilestoneGroup[]): Array<{
  id: number;
  title: string;
  status: "done" | "current" | "upcoming";
  percent?: number;
  amountValue?: number | null;
  amount?: string;
}> {
  return milestoneGroups.map(group => {
    // Lấy amountValue lớn nhất trong group
    const maxAmountValue = Math.max(...group.milestones.map(m => m.amountValue));

    return {
      id: group.id,
      title: group.title,
      status: group.status,
      amountValue: maxAmountValue,
    };
  });
}

export function findGroupById(milestoneGroups: MilestoneGroup[], groupId: number): MilestoneGroup | undefined {
  return milestoneGroups.find(group => group.id === groupId);
}

export function getFlattenedMilestones(milestoneGroups: MilestoneGroup[]): Array<{
  groupId: number;
  status: "done" | "current" | "upcoming";
  amountValue: number;
}> {
  return milestoneGroups.flatMap(group => group.milestones);
}
