import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/expert/booking:
 *   post:
 *     summary: Create expert booking request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               notes:
 *                 type: string
 *             required:
 *               - name
 *               - phoneNumber
 *     responses:
 *       200:
 *         description: Booking request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ExpertBooking'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
export async function POST(req: NextRequest) {
  try {
    const { verifyMobileToken } = await import("@/lib/mobileAuth");
    const userId = await verifyMobileToken(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phoneNumber, notes } = body;

    if (!name || !phoneNumber) {
      return NextResponse.json(
        { error: "Name and Phone number are required" },
        { status: 400 }
      );
    }

    // 1. Update User's profile
    await db.user.update({
      where: { id: userId },
      data: {
        name: name || "",
        phone: phoneNumber,
      },
    });

    // 2. Create Expert Booking Request
    const booking = await db.expertOneOnOneBooking.create({
      data: {
        userId,
        status: "PENDING",
        notes: notes || "",
        paymentStatus: "PENDING", // Default to pending until payment is confirmed
        amount: 499000,
      },
    });

    return NextResponse.json({ success: true, data: booking });
  } catch (error) {
    console.error("[EXPERT_BOOKING_API]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
