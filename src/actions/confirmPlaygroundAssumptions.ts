'use server';

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";

// Định nghĩa schema để validate assumptions gửi lên
const assumptionSchema = z.object({
  pctSalaryGrowth: z.number(),
  pctInvestmentReturn: z.number(),
  monthlyLivingExpenses: z.number(),
  monthlyOtherIncome: z.number(),
});

export async function confirmPlaygroundAssumptions(
  planId: string,
  newAssumptions: z.infer<typeof assumptionSchema>,
  interactionLog: any[] // đây sẽ là mảng JSON client-side gửi lên
) {
  // 1. Xác thực người dùng
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // 2. Kiểm tra quyền truy cập plan
  const plan = await db.plan.findUnique({
    where: { id: planId },
    select: { userId: true },
  });

  if (!plan || plan.userId !== userId) throw new Error("Forbidden");

  // 3. Validate assumptions
  const parsed = assumptionSchema.safeParse(newAssumptions);
  if (!parsed.success) throw new Error("Invalid assumptions");

  // 4. Cập nhật plan
  await db.plan.update({
    where: { id: planId },
    data: {
      ...parsed.data,
      playgroundInteractionLog: interactionLog, // Prisma sẽ tự stringify mảng JSON này
      reportGeneratedAt: null, // Reset báo cáo cũ
    },
  });

  return { success: true };
}
