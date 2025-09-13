import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import EditPlanFlow from "@/components/plan/EditPlanFlow"; // Component mới sẽ tạo
import { db } from "@/lib/db";
import { Plan, PlanFamilySupport } from "@prisma/client";

type PlanWithFamilySupport = Plan & {
    familySupport: PlanFamilySupport | null;
  };

export default async function EditPlanPage({ params }: { params: { planId: string } }) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const plan = await db.plan.findUnique({
    where: { id: params.planId, userId: user.id },
  });

  // Security check: ensure the user owns this plan
  if (!plan || plan.userId !== user.id) {
    return <div>Không tìm thấy kế hoạch hoặc bạn không có quyền truy cập.</div>;
  }

  return <EditPlanFlow initialPlan={plan as PlanWithFamilySupport} />;
}