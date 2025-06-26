import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MultiStepForm from "@/components/plan/multi-step-form/MultiStepForm";

export default async function NewPlanPage() {
  const { userId } = await auth();

  if (!userId) {
    // Redirect to sign-in if the user is not authenticated
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen bg-black text-white p-2 md:p-4">
      <div className="container mx-auto max-w-5xl">
        <MultiStepForm userId={userId} />
      </div>
    </main>
  );
}
