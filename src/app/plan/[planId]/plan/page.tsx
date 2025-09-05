import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import PlanPageClient from "@/components/plan/plan/PlanPageClient";
import { getOrCreateFullMilestoneData } from "@/actions/milestoneProgress";

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: { planId: string };
  searchParams: { milestoneId?: string; step?: string }; // Thêm 'step' vào đây
}) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Lấy dữ liệu plan gốc
  const planData = await db.plan.findUnique({
    where: { id: params.planId, userId: user.id },
    include: { 
      familySupport: true,
    },
  });

  if (!planData) {
    redirect("/dashboard");
  }
   
  // Lấy dữ liệu progress và roadmap
  const { progress, roadmap } = await getOrCreateFullMilestoneData(params.planId, user.id);

  const initialMilestoneId = searchParams.milestoneId 
    ? parseInt(searchParams.milestoneId) 
    : undefined;

  // Đọc và chuyển đổi `step` từ URL
  const initialStep = searchParams.step 
    ? parseInt(searchParams.step) 
    : undefined;

  return (
    <PlanPageClient 
      initialPlan={planData} 
      initialMilestoneId={initialMilestoneId}
      initialStep={initialStep} // Truyền `initialStep` vào props
      initialProgress={progress}
      initialRoadmap={roadmap}
    />
  );
} 