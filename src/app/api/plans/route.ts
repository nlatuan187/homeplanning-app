import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { calculateAffordability } from "@/lib/calculations/affordability";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    // Create a new plan in the database
    const plan = await db.plan.create({
      data: {
        userId,
        planName: body.planName || "Kế hoạch mua nhà",
        yearsToPurchase: Number(body.yearsToPurchase),
        targetHousePriceN0: Number(body.targetHousePriceN0),
        targetHouseType: body.targetHouseType,
        targetLocation: body.targetLocation,
        maritalStatus: body.maritalStatus,
        hasDependents: Boolean(body.hasDependents),
        numberOfDependents: Number(body.numberOfDependents || 0),
        plansMarriageBeforeTarget: Boolean(body.plansMarriageBeforeTarget || false),
        targetMarriageYear: body.targetMarriageYear ? Number(body.targetMarriageYear) : null,
        plansChildBeforeTarget: Boolean(body.plansChildBeforeTarget || false),
        targetChildYear: body.targetChildYear ? Number(body.targetChildYear) : null,
        initialSavingsGoal: Number(body.initialSavingsGoal),
        incomeLastYear: Number(body.incomeLastYear),
        monthlyOtherIncome: Number(body.monthlyOtherIncome),
        monthlyLivingExpenses: Number(body.monthlyLivingExpenses),
        monthlyNonHousingDebt: Number(body.monthlyNonHousingDebt),
        currentAnnualInsurancePremium: Number(body.currentAnnualInsurancePremium),
        spouseMonthlyIncome: Number(body.spouseMonthlyIncome || 0),
        pctHouseGrowth: Number(body.pctHouseGrowth),
        pctSalaryGrowth: Number(body.pctSalaryGrowth),
        pctExpenseGrowth: Number(body.pctExpenseGrowth),
        pctInvestmentReturn: Number(body.pctInvestmentReturn),
        factorMarriage: Number(body.factorMarriage),
        factorChild: Number(body.factorChild),
        loanInterestRate: Number(body.loanInterestRate),
        loanTermMonths: Number(body.loanTermMonths),
      },
    });

    // Calculate affordability
    const affordabilityResult = calculateAffordability(plan);

    // Update the plan with the affordability outcome and first viable year
    await db.plan.update({
      where: {
        id: plan.id,
      },
      data: {
        affordabilityOutcome: affordabilityResult.affordabilityOutcome,
        firstViableYear: affordabilityResult.firstViableYear,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("[PLANS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all plans for the current user
    const plans = await db.plan.findMany({
      where: {
        userId,
      },
      include: {
        familySupport: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("[PLANS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
