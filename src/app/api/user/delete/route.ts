import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * @swagger
 * /api/user/delete:
 *   delete:
 *     summary: Delete user account
 *     description: Permanently deletes the user account and all associated data. This action is irreversible.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export async function DELETE(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const { verifyMobileToken } = await import('@/lib/mobileAuth');
    const userId = await verifyMobileToken(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Delete from Clerk (Source of Truth)
    // This will trigger the webhooks to clean up other services if any
    try {
      const client = await clerkClient();
      await client.users.deleteUser(userId);
    } catch (error) {
      console.error("Error deleting user from Clerk:", error);
      // If user is already deleted in Clerk, we should still proceed to clean up DB
    }

    // 3. Delete from Local Database
    // We do this explicitly here to ensure immediate feedback to the mobile app
    // even if the webhook is delayed.
    try {
      await db.user.delete({
        where: { id: userId },
      });
    } catch (error) {
      // Ignore if record not found (already deleted by webhook or race condition)
      console.log("User might already be deleted from DB or not found");
    }

    return NextResponse.json({ success: true, message: "Account deleted successfully" });

  } catch (error) {
    console.error("Error processing account deletion:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
