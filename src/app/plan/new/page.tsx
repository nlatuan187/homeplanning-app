import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import PlanForm, { ExistingPlanData, SectionType } from "@/components/plan/plan-form";
import { notFound } from "next/navigation";

interface NewPlanPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewPlanPage({ searchParams }: NewPlanPageProps) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user exists in our database, if not create them
  const dbUser = await db.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!dbUser) {
    await db.user.create({
      data: {
        id: user.id,
        email: user.emailAddresses[0].emailAddress,
      },
    });
  }

  // Check if we're in edit mode
  const searchParamsData = await searchParams;
  const editPlanId = searchParamsData.edit as string | undefined;
  const startSection = searchParamsData.section as string | undefined;
  let existingPlan = undefined;
  let editMode = false;

  if (editPlanId) {
    // Fetch the plan data
    existingPlan = await db.plan.findUnique({
      where: {
        id: editPlanId,
      },
    });

    // Verify the user owns the plan
    if (!existingPlan || existingPlan.userId !== user.id) {
      notFound();
    }

    editMode = true;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4">
      <div className="container mx-auto max-w-3xl">
        <PlanForm 
          userId={user.id} 
          existingPlan={existingPlan as ExistingPlanData} 
          editMode={editMode} 
          startSection={startSection as SectionType | undefined}
        />
      </div>
    </main>
  );
}
