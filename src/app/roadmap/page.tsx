import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";

export default async function RoadmapLanding() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Tìm plan mới nhất của user; nếu có thì điều hướng thẳng tới roadmap của plan
  const plan = await db.plan.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (plan) {
    redirect(`/plan/${plan.id}/roadmap`);
  }

  // Chưa có kế hoạch: hiển thị hướng dẫn + CTA
  return (
    <main className="min-h-screen bg-[#121212] text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-3">Chưa có kế hoạch</h1>
        <p className="text-slate-300 mb-6">
          Hiện tại bạn chưa có kế hoạch để hiển thị lộ trình. Hãy tạo một kế hoạch mới để bắt đầu.
        </p>
        <Link
          href="/plan/new"
          className="inline-block px-4 py-2 rounded-md bg-white text-slate-900 font-semibold hover:bg-slate-200"
        >
          Tạo kế hoạch
        </Link>
      </div>
    </main>
  );
}
