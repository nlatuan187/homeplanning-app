"use server";

import { db } from "@/lib/db";
import { Plan } from "@prisma/client";

// Extended Plan type (can be defined here or imported if shared)
type ExtendedPlan = Plan & {
  buffer?: number;
  userEmail?: string;
  revisionHistory?: Record<string, unknown>;
};

export async function getPlansForUser(userId: string): Promise<ExtendedPlan[]> {
  if (!userId) return [];
  // Ensure Prisma Client is only used on the server.
  // The "use server" directive at the top of this file ensures this.
  const plans = await db.plan.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" }, // Sắp xếp theo ngày cập nhật mới nhất
    take: 1, // Chỉ lấy 1 kế hoạch duy nhất
    select: {
      // Keep valid fields
      id: true,
      planName: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      userEmail: true,
      
      // Goal
      yearsToPurchase: true,
      targetHouseType: true,
      targetLocation: true,
      targetHousePriceN0: true,
      
      // Result
      affordabilityOutcome: true,
      firstViableYear: true,
      confirmedPurchaseYear: true,
      buffer: true,

      // Report Status
      reportGeneratedAt: true,
    },
  });
  // Important: Ensure that the data returned is serializable if it's passed from server to client.
  // Prisma's default return types (like Date for createdAt/updatedAt) are generally fine.
  return plans as ExtendedPlan[];
}
