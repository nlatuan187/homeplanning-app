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

// Định nghĩa interface mới cho MilestoneGroup theo yêu cầu
export interface MilestoneGroup {
  id: number;
  title: string;
  status: "done" | "current" | "upcoming";
  milestones: {
    groupId: number;
    status: "done" | "current" | "upcoming"; // ← Add "current" here
    amountValue: number;
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

// Thêm function để lấy items theo groupId
function getItemsByGroupId(groupId: number, plan: Plan): { text: string; type: string; status: string; amount?: number }[] {
  if (!plan) return [];
  
  // Tính toán các giá trị từ plan (đơn vị: triệu)
  const monthlyExpenses = (plan.monthlyLivingExpenses + (plan.monthlyNonHousingDebt || 0));
  const monthlyIncome = (plan.userMonthlyIncome + (plan.hasCoApplicant ? (plan.coApplicantMonthlyIncome || 0) : 0));
  const monthlyOtherIncome = (plan.monthlyOtherIncome || 0);
  const investmentReturn = plan.pctInvestmentReturn || 0;
  
  // Tính toán các giá trị phức tạp (đơn vị triệu)
  const milestoneTimespan = 1; // tháng
  const totalExpensesForPeriod = monthlyExpenses * milestoneTimespan;
  const emergencyFund = monthlyExpenses * 2;
  const expectedInvestmentReturn = ((plan.initialSavings || 0)) * investmentReturn * (milestoneTimespan / 12);
  
  // Định nghĩa items cho từng groupId
  const itemsByGroup: Record<number, { text: string; type: string; status: string; amount?: number }[]> = {
    1: [
      { text: "Chọn phương pháp ghi chép dòng tiền của gia đình để theo dõi trong dài hạn (excel, ứng dụng theo dõi,...)", type: "system", status: "incomplete" },
      { text: "Ghi chép đầy đủ về các khoản chi tiêu hàng ngày, phân loại theo 3 nhóm Thiết yếu - Giải trí - Khác", type: "system", status: "incomplete" },
      { text: "Ghi chép đầy đủ về các khoản thu: lương tháng, các nguồn thu nhập khác, tiền lãi đầu tư, tiền tiết kiệm,...", type: "system", status: "incomplete" },
      { text: "Cuối tháng đối chiếu tổng chi, tổng thu với số tiền đã input lúc đầu", type: "system", status: "incomplete" },
      { text: `Chi tiêu gia đình không vượt quá ${monthlyExpenses.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: -monthlyExpenses },
      { text: `Thu nhập từ lương của gia đình đạt ${monthlyIncome.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: monthlyIncome },
      ...(monthlyOtherIncome > 0 ? [{ text: `Thu nhập từ công việc phụ đạt ${monthlyOtherIncome.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: monthlyOtherIncome }] : []),
    ],
    
    2: [
      { text: "Rà soát lại các khoản chi bất hợp lý trong từng nhóm hoặc điều chỉnh tỷ lệ chi cho các nhóm nếu có sự không phù hợp", type: "system", status: "incomplete" },
      { text: "Đối chiếu số liệu thu nhập, chi tiêu với tháng thứ nhất và với thông tin input để đảm bảo không có sai số quá lớn", type: "system", status: "incomplete" },
      { text: "Mở một tài khoản dự phòng riêng biệt, có tính thanh khoản cao", type: "system", status: "incomplete" },
      { text: `Trích từ tài khoản tiết kiệm hoặc thu nhập hàng tháng ${monthlyExpenses.toLocaleString()} triệu để gửi vào tài khoản dự phòng`, type: "system", status: "incomplete", amount: -monthlyExpenses },
      ...(monthlyOtherIncome > 0 ? [{ text: `Thu nhập từ công việc phụ đạt ${monthlyOtherIncome.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: monthlyOtherIncome }] : []),
      { text: `Chi tiêu gia đình không vượt quá ${monthlyExpenses.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: -monthlyExpenses },
      { text: `Thu nhập từ lương của gia đình đạt ${monthlyIncome.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: monthlyIncome },
      ...(monthlyOtherIncome > 0 ? [{ text: `Thu nhập từ công việc phụ đạt ${monthlyOtherIncome.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: monthlyOtherIncome }] : []),
    ],
    
    3: [
      { text: `Duy trì chi tiêu ở mức ${monthlyExpenses.toLocaleString()} triệu mỗi tháng. Nghĩa là trong cột mốc này cần đảm bảo chi tiêu dao động ${totalExpensesForPeriod.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: -totalExpensesForPeriod },
      { text: `Duy trì mức lương hàng tháng ${monthlyIncome.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: monthlyIncome * milestoneTimespan },
      { text: `Mang tiền tiết kiệm đi đầu tư với tỷ lệ lợi nhuận ${(investmentReturn * 100).toFixed(1)}%, đảm bảo thu nhập từ đầu tư nằm trong khoảng ${expectedInvestmentReturn.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: expectedInvestmentReturn },
      { text: `Bổ sung thêm ${emergencyFund.toLocaleString()} triệu (tương đương 2 tháng chi tiêu) vào quỹ dự phòng để tạo được quỹ dự phòng trị giá 3 tháng chi phí của gia đình`, type: "system", status: "incomplete", amount: -emergencyFund },
    ],
    
    4: [
      { text: `Duy trì chi tiêu ở mức ${monthlyExpenses.toLocaleString()} triệu mỗi tháng. Nghĩa là trong cột mốc này cần đảm bảo chi tiêu dao động ${totalExpensesForPeriod.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: -totalExpensesForPeriod },
      { text: `Duy trì mức lương hàng tháng ${monthlyIncome.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: monthlyIncome * milestoneTimespan },
      { text: `Nếu không thể tăng lương, đề xuất tìm kiếm công việc làm thêm để kiếm thêm ít nhất ${(monthlyIncome * 0.1).toLocaleString()} triệu (freelance, dạy thêm,...)`, type: "system", status: "incomplete", amount: monthlyIncome * 0.1 },
      { text: `Mang tiền tiết kiệm đi đầu tư với tỷ lệ lợi nhuận ${(investmentReturn * 100).toFixed(1)}%, đảm bảo thu nhập từ đầu tư nằm trong khoảng ${expectedInvestmentReturn.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: expectedInvestmentReturn },
      { text: `Bổ sung thêm ${emergencyFund.toLocaleString()} triệu (tương đương 2 tháng chi tiêu) vào quỹ dự phòng để tạo được quỹ dự phòng trị giá 3 tháng chi phí của gia đình`, type: "system", status: "incomplete", amount: -emergencyFund },
      { text: "Tìm hiểu tối thiểu sản phẩm của 3 công ty bảo hiểm và so sánh các gói", type: "system", status: "incomplete" },
      { text: "Nói chuyện với tư vấn viên để có được mức phí, thời gian đóng và điều khoản hợp lý", type: "system", status: "incomplete" },
      { text: "Ước tính chi phí dành cho bảo hiểm hàng tháng tương đương 5% thu nhập, nghĩa là khoảng [5% x thu nhập hàng năm] để chọn gói phù hợp", type: "system", status: "incomplete" },
    ],
    
    5: [
      { text: `Duy trì chi tiêu ở mức ${monthlyExpenses.toLocaleString()} triệu mỗi tháng. Nghĩa là trong cột mốc này cần đảm bảo chi tiêu dao động ${totalExpensesForPeriod.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: -totalExpensesForPeriod },
      { text: `Nếu không thể tăng lương, đề xuất tìm kiếm công việc làm thêm để kiếm thêm ít nhất ${(monthlyIncome * 0.1).toLocaleString()} triệu (freelance, dạy thêm,...)`, type: "system", status: "incomplete", amount: monthlyIncome * 0.1 },
      { text: `Mang tiền tiết kiệm đi đầu tư với tỷ lệ lợi nhuận ${(investmentReturn * 100).toFixed(1)}%, đảm bảo thu nhập từ đầu tư nằm trong khoảng ${expectedInvestmentReturn.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: expectedInvestmentReturn },
      { text: "Làm việc với tư vấn bất động sản để lựa chọn căn nhà mong muốn", type: "system", status: "incomplete" },
      { text: "Chuẩn bị đầy đủ giấy tờ: Hợp đồng lao động, sao kê, sao kê thu nhập phụ", type: "system", status: "incomplete" },
      { text: "Chốt ngân hàng vay, so sánh các phương án pre-approved", type: "system", status: "incomplete" },
      { text: "Nhờ tư vấn pháp lý kiểm tra kỹ hồ sơ vay trước khi ký gửi", type: "system", status: "incomplete" },
    ],
    
    6: [
      { text: `Duy trì chi tiêu ở mức ${monthlyExpenses.toLocaleString()} triệu mỗi tháng. Nghĩa là trong cột mốc này cần đảm bảo chi tiêu dao động ${totalExpensesForPeriod.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: -totalExpensesForPeriod },
      { text: `Nếu không thể tăng lương, đề xuất tìm kiếm công việc làm thêm để kiếm thêm ít nhất ${(monthlyIncome * 0.1).toLocaleString()} triệu (freelance, dạy thêm,...)`, type: "system", status: "incomplete", amount: monthlyIncome * 0.1 },
      { text: `Mang tiền tiết kiệm đi đầu tư với tỷ lệ lợi nhuận ${(investmentReturn * 100).toFixed(1)}%, đảm bảo thu nhập từ đầu tư nằm trong khoảng ${expectedInvestmentReturn.toLocaleString()} triệu`, type: "system", status: "incomplete", amount: expectedInvestmentReturn },
      { text: "Chuyển đổi toàn bộ tiền tích lũy về tiền mặt hoặc gửi vào tài khoản thanh toán có thể rút ngay", type: "system", status: "incomplete" },
      { text: "Làm việc với bên ngân hàng để giải ngân, rút tiền vay", type: "system", status: "incomplete" },
      { text: "Thực hiện giao dịch mua nhà", type: "system", status: "incomplete" },
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
  console.log("groupStructure", groupStructure);
  console.log("Definitions:", definitions);
  console.log("Group structure:", groupStructure);

  const projections = generateProjections(plan);
  const confirmedProjection = projections.find(p => p.year === confirmPurchaseYear);

  const initialSavings = plan?.initialSavings || 0;
  console.log("initialSavings from plan:", initialSavings);

  // Tạo cấu trúc mới theo milestone
  const result: MilestoneGroup[] = [];
  
  // Tạo milestones theo thứ tự để có thể truy cập milestone trước đó
  for (let milestoneIndex = 0; milestoneIndex < definitions.length; milestoneIndex++) {
    const def = definitions[milestoneIndex];
    const milestoneChecklistNumbers = def.checklist;
    
    // Tạo milestones cho milestone này
    const milestones = [];
    
    for (let milestoneInGroupIndex = 0; milestoneInGroupIndex < milestoneChecklistNumbers.length; milestoneInGroupIndex++) {
      const checklistNumber = milestoneChecklistNumbers[milestoneInGroupIndex];
      
      // Tìm groupId tương ứng với checklistNumber này
      const correspondingGroup = groupStructure.find(group => 
        group.checklistNumbers.includes(checklistNumber)
      );
      const groupId = correspondingGroup ? correspondingGroup.groupId : checklistNumber;
      
      // Lấy items tương ứng với groupId này
      const items = getItemsByGroupId(groupId, plan);
      
      // Tính amountValue dựa trên logic mới
      let prevAmountValue = 0;
      
      if (milestoneIndex === 0 && milestoneInGroupIndex === 0) {
        // Milestone đầu tiên của group đầu tiên: dùng initialSavings
        prevAmountValue = (plan.initialSavings || 0);
      } else if (milestoneInGroupIndex === 0) {
        // Milestone đầu tiên trong 1 group: dùng amountValue lớn nhất của group trước
        const previousGroup = result[milestoneIndex - 1];
        if (previousGroup && previousGroup.milestones.length > 0) {
          prevAmountValue = Math.max(...previousGroup.milestones.map(m => m.amountValue));
        }
      } else {
        // Milestone sau trong cùng 1 group: dùng amountValue của milestone trước đó trong cùng group
        // Sử dụng milestones array đang được tạo
        prevAmountValue = milestones[milestoneInGroupIndex - 1].amountValue;
      }
      
      // Tính tổng amount của các items trong groupId này
      const totalItemsAmount = items.reduce((sum, item) => {
        if (item.amount !== undefined) {
          return sum + item.amount;
        }
        return sum;
      }, 0);
      
      // amountValue = prevAmountValue + tổng amount của items hiện tại
      const amountValue = prevAmountValue + totalItemsAmount;
      
      // Xác định status cho milestone này dựa trên currentSavings
      let status: "done" | "current" | "upcoming" = "upcoming";
      
      // Lấy giá trị bắt đầu của milestone (prevAmountValue)
      const startValue = prevAmountValue;

      // Lấy giá trị cuối của milestone (amountValue hiện tại)
      const endValue = amountValue;

      if (currentSavings >= endValue) {
        // Hoàn thành: currentSavings >= giá trị cuối
        status = "done";
      } else if (currentSavings >= startValue) {
        // Đang thực hiện: currentSavings >= giá trị bắt đầu nhưng < giá trị cuối
        status = "current";
      } else {
        // Chưa bắt đầu: currentSavings < giá trị bắt đầu
        status = "upcoming";
      }
      
      const milestone = {
        groupId, // ID của group mà milestone này thuộc về
        status,
        amountValue, // Sử dụng amountValue được tính theo logic mới
        items, // Thêm items vào milestone
      };
      
      // Thêm vào milestones array
      milestones.push(milestone);
    }

    const milestoneGroup = {
      id: def.goalNumber, // Sử dụng goalNumber làm ID
      title: `Cột mốc số ${def.goalNumber}`,
      milestones,
      status: "upcoming" as const, // Tạm thời set là upcoming, sẽ được update sau
    };
    
    // Thêm vào result array
    result.push(milestoneGroup);
  }

  // Sau khi tạo xong tất cả milestones, chỉ set 1 milestone duy nhất thành "current"
  // và 1 group duy nhất thành "current"
  let foundCurrent = false;
  const finalResult = result.map(group => {
    const updatedMilestones = group.milestones.map(milestone => {
      if (!foundCurrent && milestone.status === "upcoming") {
        // Tìm milestone đầu tiên chưa hoàn thành để set thành "current"
        foundCurrent = true;
        return { ...milestone, status: "current" as const };
      }
      return milestone;
    });

    // Cập nhật status tổng thể của group
    let groupStatus: "done" | "current" | "upcoming" = "upcoming";
    const allDone = updatedMilestones.every(milestone => milestone.status === "done");
    const hasCurrent = updatedMilestones.some(milestone => milestone.status === "current");
    
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

  console.log("=== Final grouped result ===");
  finalResult.forEach((group, groupIndex) => {
    console.log(`Group ${group.id}:`);
    console.log(`  Title: ${group.title}`);
    console.log(`  Status: ${group.status}`);
    console.log(`  Milestones:`, group.milestones);
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
