"use server";

import { db } from "@/lib/db";
import { Plan } from "@prisma/client";

// Định nghĩa một kiểu dữ liệu cho cấu trúc trả về của hàm.
// Kiểu này chỉ bao gồm các trường cần thiết cho dashboard của MỘT kế hoạch duy nhất.
export type PlanForDashboard = Pick<
  Plan,
  | "id"
  | "planName"
  | "createdAt"
  | "updatedAt"
  | "yearsToPurchase"
  | "targetHouseType"
  | "targetLocation"
  | "targetHousePriceN0"
  | "affordabilityOutcome"
  | "confirmedPurchaseYear"
>;

// Hàm này hiện đã được tối ưu để chỉ lấy dữ liệu của kế hoạch GẦN NHẤT
// mà dashboard yêu cầu, giúp giảm đáng kể việc truyền tải dữ liệu mạng.
export async function getPlansForUser(userId: string): Promise<PlanForDashboard | null> {
  // Đảm bảo Prisma Client chỉ được sử dụng trên server.
  // Chỉ thị "use server" ở đầu tệp này đảm bảo điều đó.
  const plan = await db.plan.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" }, // Sắp xếp để lấy kế hoạch được cập nhật gần nhất
    select: {
      id: true,
      planName: true,
      createdAt: true,
      updatedAt: true,
      yearsToPurchase: true,
      targetHouseType: true,
      targetLocation: true,
      targetHousePriceN0: true,
      affordabilityOutcome: true,
      confirmedPurchaseYear: true,
    },
  });

  return plan;
}
