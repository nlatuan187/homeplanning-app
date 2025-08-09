import { Plan } from "@prisma/client";

// milestoneUtils.ts
export interface Milestone {
  title: string;
  status: "done" | "current" | "upcoming";
  percent?: number;
  amount?: string;
  icon?: string;
  amountValue?: number | null;
}

export interface MilestoneGroup {
  id: number;
  milestones: Milestone[];
}

// Định nghĩa các milestone theo thứ tự Goal 1-11
const milestoneDefinitions: Record<
  "under1" | "under2" | "over2",
  { goalNumber: number; percent?: number; amount?: string }[]
> = {
  under1: [
    { goalNumber: 1, amount: "Tháng đầu tiên" },
    { goalNumber: 2, amount: "Tháng thứ hai" },
    { goalNumber: 3, percent: 25 },
    { goalNumber: 4, percent: 50 },
    { goalNumber: 5, percent: 80 },
    { goalNumber: 6, percent: 100 },
  ],
  under2: [
    { goalNumber: 1, amount: "Tháng đầu tiên" },
    { goalNumber: 2, amount: "Tháng thứ hai" },
    { goalNumber: 3, percent: 20 },
    { goalNumber: 4, percent: 35 },
    { goalNumber: 5, percent: 50 },
    { goalNumber: 6, percent: 65 },
    { goalNumber: 7, percent: 80 },
    { goalNumber: 8, percent: 100 },
  ],
  over2: [
    { goalNumber: 1, amount: "Tháng đầu tiên" },
    { goalNumber: 2, amount: "Tháng thứ hai" },
    { goalNumber: 3, percent: 15 },
    { goalNumber: 4, percent: 30 },
    { goalNumber: 5, percent: 40 },
    { goalNumber: 6, percent: 50 },
    { goalNumber: 7, percent: 60 },
    { goalNumber: 8, percent: 70 },
    { goalNumber: 9, percent: 80 },
    { goalNumber: 10, percent: 90 },
    { goalNumber: 11, percent: 100 },
  ],
};

// Định nghĩa cấu trúc nhóm cho từng trường hợp
const groupStructures: Record<
  "under1" | "under2" | "over2",
  { groupId: number; goalNumbers: number[] }[]
> = {
  under1: [
    { groupId: 1, goalNumbers: [1] },
    { groupId: 2, goalNumbers: [2] },
    { groupId: 3, goalNumbers: [3] },
    { groupId: 4, goalNumbers: [4] },
    { groupId: 5, goalNumbers: [5] },
    { groupId: 6, goalNumbers: [6] },
  ],
  under2: [
    { groupId: 1, goalNumbers: [1] },
    { groupId: 2, goalNumbers: [2] },
    { groupId: 3, goalNumbers: [3] },
    { groupId: 4, goalNumbers: [4, 5] },
    { groupId: 5, goalNumbers: [6, 7] },
    { groupId: 6, goalNumbers: [8] },
  ],
  over2: [
    { groupId: 1, goalNumbers: [1] },
    { groupId: 2, goalNumbers: [2] },
    { groupId: 3, goalNumbers: [3] },
    { groupId: 4, goalNumbers: [4, 5, 6, 7] },
    { groupId: 5, goalNumbers: [8, 9, 10] },
    { groupId: 6, goalNumbers: [11] },
  ],
};

// Hàm helper để lấy Goal number từ title
function getGoalNumber(title: string): number {
  // Tìm pattern "Cột mốc số X" hoặc "Goal X"
  const match = title.match(/(?:Cột mốc số|Goal)\s+(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

export function getMilestonesByGroup(
  timeStart: number,
  confirmPurchaseYear: number,
  homePrice: number,
  currentSavings: number,
  plan: Plan // Thêm plan parameter để lấy thông tin cần thiết
): MilestoneGroup[] {
  const duration = confirmPurchaseYear - timeStart;

  // Debug: Log input parameters
  console.log("=== DEBUG: getMilestonesByGroup inputs ===");
  console.log("timeStart:", timeStart);
  console.log("confirmPurchaseYear:", confirmPurchaseYear);
  console.log("homePrice:", homePrice);
  console.log("currentSavings:", currentSavings);
  console.log("duration:", duration);
  console.log("plan data:", {
    initialSavings: plan?.initialSavings,
    userMonthlyIncome: plan?.userMonthlyIncome,
    hasCoApplicant: plan?.hasCoApplicant,
    coApplicantMonthlyIncome: plan?.coApplicantMonthlyIncome,
    monthlyOtherIncome: plan?.monthlyOtherIncome,
    monthlyLivingExpenses: plan?.monthlyLivingExpenses,
    monthlyNonHousingDebt: plan?.monthlyNonHousingDebt,
    currentAnnualInsurancePremium: plan?.currentAnnualInsurancePremium,
    pctInvestmentReturn: plan?.pctInvestmentReturn,
  });

  let groupKey: keyof typeof milestoneDefinitions;
  if (duration < 1) groupKey = "under1";
  else if (duration < 2) groupKey = "under2";
  else groupKey = "over2";

  console.log("Selected groupKey:", groupKey);

  const definitions = milestoneDefinitions[groupKey];
  const groupStructure = groupStructures[groupKey];

  console.log("Definitions:", definitions);
  console.log("Group structure:", groupStructure);

  // Tính toán lãi kép hàng tháng
  const calculateMonthlyCompoundSavings = (months: number, initialSavings: number, monthlySavings: number, annualReturnRate: number) => {
    const monthlyRate = Math.pow(1 + annualReturnRate / 100, 1 / 12) - 1;

    // Tiền gốc sau n tháng
    const accumulatedFromInitial = initialSavings * Math.pow(1 + monthlyRate, months);

    // Tiền gửi hàng tháng sau n tháng (Future Value of Annuity)
    const accumulatedFromMonthly = monthlySavings * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;

    return accumulatedFromInitial + accumulatedFromMonthly;
  };

  const initialSavings = plan?.initialSavings || 0;

  // Debug: Log initialSavings
  console.log("initialSavings from plan:", initialSavings);

  // Tạo milestones theo định nghĩa
  const milestones: Milestone[] = definitions.map((def, index) => {
    console.log(`=== Processing milestone ${index + 1} ===`);
    console.log("Definition:", def);

    let amountValue: number | null = null;

    if (def.percent !== undefined) {
      const targetAmount = homePrice - initialSavings;
      amountValue = initialSavings + Math.round((targetAmount * def.percent) / 100);
      console.log(`Calculated amountValue from percent: ${def.percent}% of ${targetAmount} = ${amountValue}`);
    } else if (def.amount === "Tháng đầu tiên") {
      // Tính tích lũy sau 1 tháng
      const monthlySavings = (plan.userMonthlyIncome + (plan.hasCoApplicant ? (plan.coApplicantMonthlyIncome || 0) : 0) + (plan.monthlyOtherIncome || 0) - plan.monthlyLivingExpenses - (plan.monthlyNonHousingDebt || 0) - (plan.currentAnnualInsurancePremium || 0) / 12) || 0;
      const annualReturnRate = plan.pctInvestmentReturn || 0;

      console.log("Monthly savings calculation:", {
        userMonthlyIncome: plan.userMonthlyIncome,
        coApplicantMonthlyIncome: plan.hasCoApplicant ? (plan.coApplicantMonthlyIncome || 0) : 0,
        monthlyOtherIncome: plan.monthlyOtherIncome || 0,
        monthlyLivingExpenses: plan.monthlyLivingExpenses,
        monthlyNonHousingDebt: plan.monthlyNonHousingDebt || 0,
        annualInsurance: (plan.currentAnnualInsurancePremium || 0) / 12,
        monthlySavings,
        annualReturnRate
      });

      amountValue = Math.round(calculateMonthlyCompoundSavings(1, initialSavings, monthlySavings, annualReturnRate));
      console.log(`Calculated amountValue for "Tháng đầu tiên": ${amountValue}`);
    } else if (def.amount === "Tháng thứ hai") {
      const monthlySavings = (plan.userMonthlyIncome + (plan.hasCoApplicant ? (plan.coApplicantMonthlyIncome || 0) : 0) + (plan.monthlyOtherIncome || 0) - plan.monthlyLivingExpenses - (plan.monthlyNonHousingDebt || 0) - (plan.currentAnnualInsurancePremium || 0) / 12) || 0;
      const annualReturnRate = plan.pctInvestmentReturn || 0;

      amountValue = Math.round(calculateMonthlyCompoundSavings(2, initialSavings, monthlySavings, annualReturnRate));
      console.log(`Calculated amountValue for "Tháng thứ hai": ${amountValue}`);
    } else {
      console.log("No calculation method matched, amountValue remains null");
    }

    console.log("Final amountValue for this milestone:", amountValue);

    return {
      title: `Cột mốc số ${def.goalNumber}`,
      status: index === 0 ? "current" : "upcoming",
      percent: def.percent,
      amount: def.amount,
      amountValue,
    };
  });

  console.log("=== All milestones created ===");
  milestones.forEach((milestone, index) => {
    console.log(`Milestone ${index + 1}:`, {
      title: milestone.title,
      amountValue: milestone.amountValue,
      percent: milestone.percent,
      amount: milestone.amount
    });
  });

  // Nhóm milestones theo cấu trúc đã định nghĩa
  const result: MilestoneGroup[] = groupStructure.map((group) => {
    const groupMilestones = group.goalNumbers.map((goalNumber) => {
      const milestone = milestones.find((m) => getGoalNumber(m.title) === goalNumber);
      if (milestone) {
        return milestone;
      } else {
        // Nếu không tìm thấy milestone, tạo một milestone mới với amountValue được tính toán
        console.log(`Warning: Milestone for goal ${goalNumber} not found, creating fallback`);
        
        // Tìm definition tương ứng
        const def = definitions.find(d => d.goalNumber === goalNumber);
        if (def) {
          let amountValue: number | null = null;
          
          if (def.percent !== undefined) {
            const targetAmount = homePrice - initialSavings;
            amountValue = initialSavings + Math.round((targetAmount * def.percent) / 100);
          } else if (def.amount === "Tháng đầu tiên") {
            const monthlySavings = (plan.userMonthlyIncome + (plan.hasCoApplicant ? (plan.coApplicantMonthlyIncome || 0) : 0) + (plan.monthlyOtherIncome || 0) - plan.monthlyLivingExpenses - (plan.monthlyNonHousingDebt || 0) - (plan.currentAnnualInsurancePremium || 0) / 12) || 0;
            const annualReturnRate = plan.pctInvestmentReturn || 0;
            amountValue = Math.round(calculateMonthlyCompoundSavings(1, initialSavings, monthlySavings, annualReturnRate));
          } else if (def.amount === "Tháng thứ hai") {
            const monthlySavings = (plan.userMonthlyIncome + (plan.hasCoApplicant ? (plan.coApplicantMonthlyIncome || 0) : 0) + (plan.monthlyOtherIncome || 0) - plan.monthlyLivingExpenses - (plan.monthlyNonHousingDebt || 0) - (plan.currentAnnualInsurancePremium || 0) / 12) || 0;
            const annualReturnRate = plan.pctInvestmentReturn || 0;
            amountValue = Math.round(calculateMonthlyCompoundSavings(2, initialSavings, monthlySavings, annualReturnRate));
          }
          
          return {
            title: `Cột mốc số ${goalNumber}`,
            status: "upcoming" as const,
            percent: def.percent,
            amount: def.amount,
            amountValue,
          };
        } else {
          // Nếu không tìm thấy definition, tạo milestone với amountValue mặc định
          return {
            title: `Cột mốc số ${goalNumber}`,
            status: "upcoming" as const,
            amountValue: null,
          };
        }
      }
    });

    return {
      id: group.groupId,
      milestones: groupMilestones,
    };
  });

  console.log("=== Final grouped result ===");
  result.forEach((group, groupIndex) => {
    console.log(`Group ${group.id}:`);
    group.milestones.forEach((milestone, milestoneIndex) => {
      console.log(`  ${milestone.title}: amountValue = ${milestone.amountValue}`);
    });
  });

  return result;
}

// Helper functions để xử lý milestone groups
export function updateMilestoneStatuses(milestoneGroups: MilestoneGroup[], currentSavings: number): MilestoneGroup[] {
  return milestoneGroups.map(group => {
    const updatedMilestones = group.milestones.map(milestone => {
      const milestoneAmount = milestone.amountValue || 0;

      if (currentSavings >= milestoneAmount) {
        return { ...milestone, status: "done" as const };
      } else {
        // Tìm milestone đầu tiên chưa hoàn thành trong group để set thành "current"
        const firstIncompleteIndex = group.milestones.findIndex(m =>
          (m.amountValue || 0) > currentSavings
        );

        return {
          ...milestone,
          status: firstIncompleteIndex === group.milestones.indexOf(milestone) ? "current" as const : "upcoming" as const
        };
      }
    });

    return {
      ...group,
      milestones: updatedMilestones
    };
  });
}

export function getCurrentMilestoneFromGroups(milestoneGroups: MilestoneGroup[]): Milestone | null {
  for (const group of milestoneGroups) {
    const currentMilestone = group.milestones.find(m => m.status === "current");
    if (currentMilestone) {
      return currentMilestone;
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
    // Lấy milestone cuối cùng trong group làm milestone chính
    const lastMilestone = group.milestones[group.milestones.length - 1];

    // Tính amountValue lớn nhất trong group
    const maxAmountValue = Math.max(...group.milestones.map(m => m.amountValue || 0));

    return {
      id: group.id,
      title: lastMilestone.title,
      status: lastMilestone.status,
      percent: lastMilestone.percent,
      amountValue: maxAmountValue,
      amount: lastMilestone.amount,
    };
  });
}

export function findGroupById(milestoneGroups: MilestoneGroup[], groupId: number): MilestoneGroup | undefined {
  return milestoneGroups.find(group => group.id === groupId);
}

export function getFlattenedMilestones(milestoneGroups: MilestoneGroup[]): Milestone[] {
  return milestoneGroups.flatMap(group => group.milestones);
}
