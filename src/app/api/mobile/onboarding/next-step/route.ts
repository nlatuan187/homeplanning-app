import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getNextOnboardingStep } from "@/actions/onboardingActions";

/**
 * @swagger
 * /api/mobile/onboarding/next-step:
 *   get:
 *     summary: Get next onboarding step
 *     description: Determines the next step in the onboarding flow based on current progress.
 *     tags: [Mobile Onboarding]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Next step determined successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 nextStep:
 *                   type: string
 *                   description: The URL path for the next step (e.g., /plan/[id]/familysupport)
 *                   example: "/plan/cm3.../familysupport"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Plan not found
 *       500:
 *         description: Internal server error
 */
export async function GET(req: Request) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const plan = await db.plan.findFirst({
            where: { userId: user.id },
            select: { id: true }
        });

        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        const nextStepUrl = await getNextOnboardingStep(plan.id);

        return NextResponse.json({ success: true, nextStep: nextStepUrl });
    } catch (error) {
        console.error("[MOBILE_ONBOARDING_NEXT_STEP_ERROR]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
