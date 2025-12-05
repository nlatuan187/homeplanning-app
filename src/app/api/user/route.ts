import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Get user information
 *     responses:
 *       200:
 *         description: User information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 plan:
 *                   $ref: '#/components/schemas/Plan'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export async function GET(req: NextRequest) {
  try {
    // Use hybrid auth verification
    const { verifyMobileToken } = await import('@/lib/mobileAuth');
    const userId = await verifyMobileToken(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const primaryEmail = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;

    const plan = await db.plan.findFirst({
      where: { userId },
    });

    return NextResponse.json({
      user: {
        id: clerkUser.id,
        email: primaryEmail,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      },
      plan: {
        time: plan?.firstViableYear,
        type: plan?.targetHouseType,
        location: plan?.targetLocation,
        price: plan?.targetHousePriceN0,
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
