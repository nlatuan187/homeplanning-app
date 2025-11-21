"use server";

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import logger from "@/lib/logger";
import { runProjectionWithEngine } from "./projectionHelpers";

const areValuesEqual = (val1: any, val2: any) => {
  // Treat null, undefined, and 0 as equal for numeric fields
  if ((val1 === null || val1 === undefined) && (val2 === null || val2 === undefined)) {
    return true;
  }
  return val1 === val2;
};

export async function updateAndRecalculateAssumption(
  planId: string,
  formData: any
) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const plan = await db.plan.findUnique({ where: { id: planId, userId: user.id } });
    if (!plan) return { success: false, error: "Plan not found." };

    const planReport = await db.planReport.findUnique({ where: { planId } });
    const existingResult = planReport?.projectionCache as unknown as { earliestPurchaseYear: number; message: string; isAffordable: boolean; };

    const currentData = {
      pctSalaryGrowth: plan.pctSalaryGrowth,
      pctHouseGrowth: plan.pctHouseGrowth,
      pctInvestmentReturn: plan.pctInvestmentReturn,
    };

    const hasChanged = Object.keys(currentData).some(key => !areValuesEqual(currentData[key as keyof typeof currentData], formData[key as keyof typeof formData]));

    let result;
    let customMessage = "";
    let caseNumber: number = 0;

    if (hasChanged) {
      await db.$transaction([
        db.plan.update({
          where: { id: planId },
          data: formData,
        }),
      ]);
      result = await runProjectionWithEngine(planId);

      // Calculate years for case classification
      const currentYear = new Date().getFullYear();
      const confirmedYear = plan.confirmedPurchaseYear;
      const projectedYear = result.earliestPurchaseYear;
      const yearsFromNow = projectedYear - currentYear;
      const yearsDifference = confirmedYear ? projectedYear - confirmedYear : null;

      // Classify into 5 cases based on EditPlanFlow.tsx result display logic
      // Case 1: Can purchase, but later than planned (within 3 years from now, more than 1 year later than planned)
      if (
        projectedYear > (confirmedYear ?? Infinity) &&
        yearsFromNow <= 3 &&
        yearsDifference !== null &&
        yearsDifference > 1
      ) {
        caseNumber = 1;
        customMessage = `Bạn có thể mua nhà sớm nhất vào năm ${projectedYear}`;
      }
      // Case 2: Can purchase earlier or on time (within 3 years, but not matching Case 1)
      else if (
        projectedYear > 0 &&
        yearsFromNow <= 3 &&
        yearsDifference !== null &&
        yearsDifference > 1 &&
        projectedYear <= (confirmedYear ?? Infinity)
      ) {
        caseNumber = 2;
        customMessage = `Bạn có thể mua nhà vào năm ${confirmedYear} như mong muốn, thậm chí có thể mua sớm hơn vào năm ${projectedYear}!`;
      }
      // Case 3: Can purchase exactly on time
      else if (
        projectedYear === confirmedYear &&
        yearsFromNow >= 1
      ) {
        caseNumber = 3;
        customMessage = `Bạn hoàn toàn có thể mua nhà vào năm ${confirmedYear} như mong muốn của mình`;
      }
      // Case 4: Can purchase within 1 year
      else if (
        confirmedYear &&
        confirmedYear - projectedYear <= 1
      ) {
        caseNumber = 4;
        customMessage = "Bạn có thể mua được nhà trong vòng 1 năm tới";
      }
      // Case 5: Cannot purchase as desired (default)
      else {
        caseNumber = 5;
        customMessage = "Bạn chưa thể mua được căn nhà như mong muốn";
      }

      await db.$transaction([
        db.planReport.upsert({
          where: { planId: plan.id },
          update: { projectionCache: result },
          create: { planId: plan.id, projectionCache: result },
        })
      ]);
      await db.plan.update({
        where: { id: planId },
        data: { firstViableYear: result.earliestPurchaseYear }
      });
    } else {
      result = existingResult;
      customMessage = "Không có thay đổi";
      caseNumber = 0;
    }

    revalidatePath(`/plan/${planId}`);

    // Fetch the updated plan to return
    const updatedPlan = await db.plan.findUnique({ where: { id: planId } });

    return {
      success: true,
      caseNumber: caseNumber,
      planId: planId,
      plan: updatedPlan!,
      earliestPurchaseYear: result.earliestPurchaseYear,
      message: customMessage,
      isAffordable: result.isAffordable
    };

  } catch (error) {
    logger.error("[ACTION_ERROR] Failed to update and recalculate (Assumption)", { error: String(error) });
    return { success: false, error: "Đã có lỗi xảy ra phía máy chủ." };
  }
}
