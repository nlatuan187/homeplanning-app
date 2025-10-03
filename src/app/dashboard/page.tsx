import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getPlansForUser } from "@/actions/dashboardActions";
import { getOnboardingProgress } from "@/actions/onboardingActions";
import DashboardClient from "./client"; // SỬA ĐƯỜNG DẪN IMPORT
import { Suspense } from "react";
import { NotificationManager } from '@/components/NotificationManager';

export default async function DashboardPage() {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const plan = await getPlansForUser(user.id);

    // LẤY DỮ LIỆU ONBOARDING NGAY TẠI ĐÂY
    // Chỉ lấy progress nếu có plan tồn tại
    const onboardingProgress = plan ? await getOnboardingProgress(plan.id) : null;

    const dashboardSkeleton = (
        <div className="min-h-screen bg-slate-950 p-4 flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );

    return (
        <Suspense fallback={dashboardSkeleton}>
            {/* TRUYỀN DỮ LIỆU VÀO CLIENT COMPONENT */}
            <DashboardClient initialPlan={plan} initialProgress={onboardingProgress} />
            <NotificationManager />
        </Suspense>
    );
}
