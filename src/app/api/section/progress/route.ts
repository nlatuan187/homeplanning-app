import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
    getOnboardingProgress,
    updateOnboardingSectionProgress
} from "@/actions/onboardingActions";
import { deleteOnboardingProgress } from "@/actions/editPlan";
import { OnboardingSectionState, OnboardingProgress } from "@prisma/client";

type SectionStatus = "ACTIVATE" | "INACTIVATE";

interface SectionProgress {
    state: OnboardingSectionState;
    status: SectionStatus;
}

interface FormattedProgress {
    quickCheck: SectionProgress;
    familySupport: SectionProgress;
    spending: SectionProgress;
    assumption: SectionProgress;
}

/**
 * Helper function to format progress response with status field
 * Status is determined by sequential completion logic
 */
function formatProgressResponse(progress: OnboardingProgress | null): FormattedProgress {
    const quickCheckState = progress?.quickCheckState || OnboardingSectionState.NOT_STARTED;
    const familySupportState = progress?.familySupportState || OnboardingSectionState.NOT_STARTED;
    const spendingState = progress?.spendingState || OnboardingSectionState.NOT_STARTED;
    const assumptionState = progress?.assumptionState || OnboardingSectionState.NOT_STARTED;

    return {
        quickCheck: {
            state: quickCheckState,
            status: "ACTIVATE" // Always active (first section)
        },
        familySupport: {
            state: familySupportState,
            status: quickCheckState === OnboardingSectionState.COMPLETED ? "ACTIVATE" : "INACTIVATE"
        },
        spending: {
            state: spendingState,
            status: familySupportState === OnboardingSectionState.COMPLETED ? "ACTIVATE" : "INACTIVATE"
        },
        assumption: {
            state: assumptionState,
            status: spendingState === OnboardingSectionState.COMPLETED ? "ACTIVATE" : "INACTIVATE"
        }
    };
}

/**
 * @swagger
 * /api/section/progress:
 *   get:
 *     summary: Get current onboarding progress
 *     description: Retrieves the onboarding progress for the authenticated user. Returns default progress if no plan exists.
 *     tags: [Mobile Onboarding]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 planId:
 *                   type: string
 *                   description: Plan ID (only present if plan exists)
 *                 progress:
 *                   type: object
 *                   properties:
 *                     quickCheck:
 *                       type: object
 *                       properties:
 *                         state:
 *                           type: string
 *                           enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *                         status:
 *                           type: string
 *                           enum: [ACTIVATE, INACTIVATE]
 *                     familySupport:
 *                       type: object
 *                       properties:
 *                         state:
 *                           type: string
 *                           enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *                         status:
 *                           type: string
 *                           enum: [ACTIVATE, INACTIVATE]
 *                     spending:
 *                       type: object
 *                       properties:
 *                         state:
 *                           type: string
 *                           enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *                         status:
 *                           type: string
 *                           enum: [ACTIVATE, INACTIVATE]
 *                     assumption:
 *                       type: object
 *                       properties:
 *                         state:
 *                           type: string
 *                           enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *                         status:
 *                           type: string
 *                           enum: [ACTIVATE, INACTIVATE]
 *       401:
 *         description: Unauthorized
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

        let progress = null;
        if (plan) {
            progress = await getOnboardingProgress(plan.id);
        }

        const formattedProgress = formatProgressResponse(progress);

        const response: any = {
            success: true,
            progress: formattedProgress
        };

        // Only include planId if plan exists
        if (plan) {
            response.planId = plan.id;
        }

        return NextResponse.json(response);
    } catch (error) {
        console.error("[MOBILE_ONBOARDING_GET_ERROR]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/section/progress:
 *   post:
 *     summary: Update onboarding section progress
 *     description: Updates the status of a specific onboarding section.
 *     tags: [Mobile Onboarding]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - section
 *               - state
 *             properties:
 *               section:
 *                 type: string
 *                 enum: [familySupport, spending, assumption, quickCheck]
 *               state:
 *                 type: string
 *                 enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *     responses:
 *       200:
 *         description: Progress updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 progress:
 *                   type: object
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Plan not found
 *       500:
 *         description: Internal server error
 */
export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { section, state } = body;

        if (!section || !state) {
            return NextResponse.json({ error: "Missing section or state" }, { status: 400 });
        }

        const plan = await db.plan.findFirst({
            where: { userId: user.id },
            select: { id: true }
        });

        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        const result = await updateOnboardingSectionProgress(
            plan.id,
            section as "familySupport" | "spending" | "assumption" | "quickCheck",
            state as OnboardingSectionState
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, progress: result.progress });
    } catch (error) {
        console.error("[MOBILE_ONBOARDING_POST_ERROR]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/section/progress:
 *   delete:
 *     summary: Delete onboarding progress
 *     description: Removes the onboarding progress record. Should be called when onboarding is fully completed.
 *     tags: [Mobile Onboarding]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Progress deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Plan not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(req: Request) {
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

        const result = await deleteOnboardingProgress(plan.id);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[MOBILE_ONBOARDING_DELETE_ERROR]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
