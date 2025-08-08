// milestoneUtils.ts
export interface Milestone {
  id: number;
  title: string;
  status: "done" | "current" | "upcoming";
  percent?: number;
  amount?: string;
  icon?: string;
  amountValue?: number | null;
}

const baseMilestones: Omit<Milestone, "id">[] = [
  { title: "Goal 1", amount: "Tháng đầu tiên", status: "done" },
  { title: "Goal 2", amount: "Tháng thứ hai", status: "done" },
  { title: "Goal 4", percent: 50, status: "upcoming" },
  { title: "Goal 5", percent: 80, status: "upcoming" },
  { title: "Goal 6", percent: 100, status: "upcoming" },
];

const extraMilestonesMap: Record<
  "under1" | "under2" | "over2",
  { title: string; percents: number[] }[]
> = {
  under1: [{ title: "Goal 3", percents: [25] }],
  under2: [
    { title: "Goal 3", percents: [20] },
    { title: "Goal 4", percents: [35, 50] },
    { title: "Goal 5", percents: [65, 80] },
  ],
  over2: [
    { title: "Goal 3", percents: [15] },
    { title: "Goal 4", percents: [30, 40, 50, 60] },
    { title: "Goal 5", percents: [70, 80, 90] },
  ],
};

export function getMilestonesByGroup(
  timeStart: number,
  confirmPurchaseYear: number,
  homePrice: number,
  currentSavings: number
): Milestone[] {
  const duration = confirmPurchaseYear - timeStart;

  let groupKey: keyof typeof extraMilestonesMap;
  if (duration < 1) groupKey = "under1";
  else if (duration < 2) groupKey = "under2";
  else groupKey = "over2";

  const extraSet = extraMilestonesMap[groupKey];
  const expanded: Omit<Milestone, "id">[] = [];

  const goal3Extra = extraSet.find((e) => e.title === "Goal 3");
  const restExtras = extraSet.filter((e) => e.title !== "Goal 3");

  for (const base of baseMilestones) {
    expanded.push(base);

    if (base.title === "Goal 2" && goal3Extra) {
      for (const percent of goal3Extra.percents.sort((a, b) => a - b)) {
        expanded.push({
          title: "Goal 3",
          percent,
          status: "upcoming",
        });
      }
    }

    const matchingExtras = restExtras.filter((e) => e.title === base.title);
    for (const extra of matchingExtras) {
      for (const percent of extra.percents.sort((a, b) => a - b)) {
        const isDuplicateWithBase =
          "percent" in base && typeof base.percent === "number" && base.percent === percent;

        if (!isDuplicateWithBase) {
          expanded.push({
            title: base.title,
            percent,
            status: "upcoming",
          });
        }
      }
    }
  }

  const withAmount = expanded.map((m, idx) => {
    const amountValue =
      m.percent !== undefined ? Math.round((m.percent / 100) * homePrice) : null;
    return {
      id: idx + 1,
      ...m,
      amountValue,
    };
  });

  let currentMarked = false;
  const withStatus = withAmount.map((m) => {
    if (m.amountValue === null) return m;
    if (currentSavings >= m.amountValue) return { ...m, status: "done" as const };
    if (!currentMarked) {
      currentMarked = true;
      return { ...m, status: "current" as const };
    }
    return { ...m, status: "upcoming" as const };
  });

  return withStatus;
}
