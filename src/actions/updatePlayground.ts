'use server';

import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server"; // Giả sử dùng auth để bảo mật

type InteractionLogEntry = {
  timestamp: string;
  type: string;
  values?: Record<string, any>;
};

/**
 * Cập nhật hoặc thêm mới một entry trong playgroundInteractionLog.
 * Hàm này đủ thông minh để "gom nhóm" các thay đổi liên tiếp.
 * @param planId ID của kế hoạch
 * @param newEntry Entry log mới cần thêm hoặc cập nhật
 */
export async function upsertInteractionLogEntry(planId: string, newEntry: InteractionLogEntry) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const plan = await db.plan.findFirst({
      where: { id: planId, userId: userId }, // Đảm bảo người dùng sở hữu plan
      select: { playgroundInteractionLog: true },
    });

    if (!plan) {
      throw new Error("Plan not found or access denied");
    }

    let currentLog: InteractionLogEntry[] = (plan.playgroundInteractionLog as InteractionLogEntry[]) || [];
    const lastLog = currentLog.length > 0 ? currentLog[currentLog.length - 1] : null;

    // Logic gom nhóm theo yêu cầu:
    // Nếu log cuối cùng có type là 'initial_change' và log mới cũng vậy,
    // ta sẽ gộp `values` của chúng lại.
    // Các loại log khác (như 'interaction_start') sẽ luôn tạo entry mới.
    if (lastLog && lastLog.type === 'initial_change' && newEntry.type === 'initial_change') {
      const updatedValues = { ...(lastLog.values || {}), ...(newEntry.values || {}) };
      currentLog[currentLog.length - 1] = {
        ...lastLog,
        timestamp: newEntry.timestamp, // Luôn cập nhật timestamp của lần tương tác cuối
        values: updatedValues,
      };
    } else {
      currentLog.push(newEntry);
    }

    await db.plan.update({
      where: { id: planId },
      data: {
        playgroundInteractionLog: currentLog,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to upsert interaction log entry:", error);
    return { success: false, error: "Server error" };
  }
}

export async function updatePlaygroundValue(
  planId: string,
  field: string,
  value: string | number
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Cập nhật giá trị cụ thể (debounced từ frontend)
    await db.plan.update({
      where: { id: planId, userId },
      data: { [field]: value },
    });
  } catch (err) {
    console.error("[PLAYGROUND_UPDATE_ERROR]", err);
  }
}

export async function updatePlaygroundValues(
  planId: string,
  updates: Record<string, string | number>
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await db.plan.update({
      where: { id: planId, userId },
      data: updates, // update nhiều trường
    });
  } catch (err) {
    console.error("[PLAYGROUND_UPDATE_ERROR]", err);
  }
}