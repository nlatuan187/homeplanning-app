import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Plan } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

// Extended Plan type with our new fields
type ExtendedPlan = Plan & {
  buffer?: number;
  userEmail?: string;
  revisionHistory?: Record<string, unknown>;
};

export default async function Dashboard() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get all plans for the current user
  const plans = await db.plan.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: { // Explicitly select only needed and existing fields
      id: true,
      planName: true,
      createdAt: true,
      yearsToPurchase: true,
      targetHouseType: true,
      targetLocation: true,
      targetHousePriceN0: true,
      affordabilityOutcome: true,
      buffer: true,
      firstViableYear: true,
      // Include other fields from ExtendedPlan if they are in the DB and might be used,
      // but ensure not to select columns that were removed (reportRiskManagement, etc.)
      userId: true, // Good practice to include
      // userEmail: true, // If needed and exists
      // revisionHistory: true, // If needed and exists
      // Also include all fields from the Plan model that are NOT the removed report fields
      updatedAt: true,
      maritalStatus: true,
      hasDependents: true,
      numberOfDependents: true,
      plansMarriageBeforeTarget: true,
      targetMarriageYear: true,
      plansChildBeforeTarget: true,
      targetChildYear: true,
      initialSavingsGoal: true,
      incomeLastYear: true,
      monthlyOtherIncome: true,
      monthlyLivingExpenses: true,
      monthlyNonHousingDebt: true,
      currentAnnualInsurancePremium: true,
      spouseMonthlyIncome: true,
      pctHouseGrowth: true,
      pctSalaryGrowth: true,
      pctExpenseGrowth: true,
      pctInvestmentReturn: true,
      factorMarriage: true,
      factorChild: true,
      loanInterestRate: true,
      loanTermMonths: true,
      // paymentMethod: true, // Removed as it's not used on this page and causing TS error
      confirmedPurchaseYear: true,
      reportGeneratedAt: true,
      reportAssetEfficiency: true,
      reportCapitalStructure: true,
      reportSpendingPlan: true,
      reportInsurance: true,
      reportBackupPlans: true,
      revisionCount: true,
      userEmail: true, // Added as it's in ExtendedPlan
      // revisionHistory is Json?, Prisma select handles it if it exists
    }
  }) as ExtendedPlan[];

  // Get current year
  const currentYear = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-slate-950 p-4">
      <div className="container mx-auto max-w-7xl">
        <header className="flex justify-between items-center py-6">
          <h1 className="text-2xl font-bold">Lập kế hoạch mua nhà</h1>
          <UserButton afterSignOutUrl="/" />
        </header>

        <div className="grid gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Chào mừng, {user?.firstName || "Bạn"}!</CardTitle>
              <CardDescription>
                Bắt đầu lập kế hoạch tài chính để mua nhà đầu tiên của bạn
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                Công cụ này sẽ giúp bạn lập kế hoạch tài chính, đánh giá khả năng chi trả và theo dõi tiến trình để sở hữu ngôi nhà đầu tiên.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href="/plan/new">Tạo kế hoạch mới</Link>
              </Button>
            </CardFooter>
          </Card>

          {plans.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">Kế hoạch của bạn</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  // Calculate target year
                  const targetYear = currentYear + plan.yearsToPurchase;

                  // Determine the link for "Xem chi tiết"
                  let detailLink = `/plan/${plan.id}/results`; // Default link

                  if (plan.affordabilityOutcome === "ScenarioB" && 
                      plan.confirmedPurchaseYear && 
                      plan.reportGeneratedAt) {
                    // Condition 3: Scenario B, confirmed purchase year, and report has been generated
                    // We might want to add cache freshness check here later if needed.
                    // For now, reportGeneratedAt existing is enough.
                    detailLink = `/plan/${plan.id}/report`;
                  }
                  // Cases 1 (ScenarioA) and 2 (ScenarioB without confirmed year or no report)
                  // will use the default detailLink to /results.

                  return (
                    <Card key={plan.id}>
                      <CardHeader>
                        <CardTitle>{plan.planName || "Kế hoạch mua nhà"}</CardTitle>
                        <CardDescription>
                          Tạo ngày {new Date(plan.createdAt).toLocaleDateString("vi-VN")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Mục tiêu:</dt>
                            <dd>Mua nhà vào năm {targetYear}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Loại nhà:</dt>
                            <dd>{plan.targetHouseType}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Khu vực:</dt>
                            <dd>{plan.targetLocation}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Giá dự kiến:</dt>
                            <dd>{plan.targetHousePriceN0.toLocaleString()} triệu VNĐ</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Kết quả:</dt>
                            <dd className={
                              plan.affordabilityOutcome === "ScenarioA" && (plan.buffer ?? 0) >= 0
                                ? "text-green-400" 
                                : "text-yellow-400"
                            }>
                              {plan.affordabilityOutcome === "ScenarioA"
                                ? (plan.buffer ?? 0) >= 0
                                  ? "Khả thi đúng kế hoạch"
                                  : "Chưa khả thi"
                                : plan.firstViableYear
                                  ? `Khả thi từ năm ${plan.firstViableYear}`
                                  : "Chưa khả thi"}
                            </dd>
                          </div>
                        </dl>
                      </CardContent>
                      <CardFooter>
                        <Button asChild variant="outline" className="w-full">
                          <Link href={detailLink}>Xem chi tiết</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
