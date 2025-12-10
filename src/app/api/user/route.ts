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
    let clerkUser;

    try {
      clerkUser = await client.users.getUser(userId);
    } catch (error: any) {
      if (error.status === 404) {
        return NextResponse.json({ error: "User not found" }, { status: 401 });
      }
      throw error;
    }

    const primaryEmail = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;

    const plan = await db.plan.findFirst({
      where: { userId },
    });

    let planReport = null;
    if (plan) {
      planReport = await db.planReport.findUnique({
        where: { planId: plan.id },
      });
    }
    const actualCache = (planReport?.projectionCache as any)?.projectionCache;
    const projection = actualCache?.projections || actualCache;
    const loanAmount = projection?.loanAmountNeeded;
    const housePrice = projection?.housePriceProjected;
    const amountSaved = housePrice - loanAmount;

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
      },
      amountSaved: amountSaved,
      housePrice: housePrice,
      loanAmount: loanAmount,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
