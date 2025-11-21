import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import logger from "@/lib/logger";
import { z } from "zod";
import { db } from "@/lib/db";
import {
    updateSpending, updateSpendingSchema,
    updateAssumptions, updateAssumptionsSchema,
    updateFamilySupport, updateFamilySupportSchema,
    invalidateReportCache
} from "@/lib/services/planService";
import { runProjectionWithEngine } from "@/actions/projectionHelpers";

// Schema để validate phần thân của request
const bodySchema = z.object({
    section: z.enum(["spending", "assumptions", "familySupport"]),
    data: z.any(),
});

/**
 * @swagger
 * /api/plans/{planId}/section:
 *   patch:
 *     summary: Update a specific section of a plan
 *     description: A unified endpoint to update different sections of a financial plan (spending, assumptions, or familySupport).
 *     tags: [Plans]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [section, data]
 *             properties:
 *               section:
 *                 type: string
 *                 enum: [spending, assumptions, familySupport]
 *                 description: The name of the section to update.
 *               data:
 *                 type: object
 *                 description: "The payload containing the fields to update. The structure depends on the 'section' value."
 *             examples:
 *               spending:
 *                 value:
 *                   section: "spending"
 *                   data: { "monthlyNonHousingDebt": 500 }
 *               familySupport:
 *                 value:
 *                   section: "familySupport"
 *                   data: { "hasFamilySupport": true, "familySupportAmount": 1000 }
 *     responses:
 *       '200': { description: "Section updated successfully." }
 *       '400': { description: "Bad Request - Invalid input data or unknown section." }
 *       # ... other responses
 * 
 */
export async function PATCH(req: NextRequest, { params }: { params: { planId: string } }) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { planId } = params;
        const body = await bodySchema.parse(await req.json());

        // Fetch current plan and report for comparison
        const plan = await db.plan.findUnique({ where: { id: planId, userId } });
        if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

        const planReport = await db.planReport.findUnique({ where: { planId } });
        const existingResult = planReport?.projectionCache as unknown as { earliestPurchaseYear: number; message: string; isAffordable: boolean; } | null;
        const previousFirstViableYear = plan.firstViableYear;

        switch (body.section) {
            case "spending": {
                const validatedData = updateSpendingSchema.parse(body.data);

                // 1. Update DB
                await updateSpending(planId, userId, validatedData);

                // 2. Recalculate
                const result = await runProjectionWithEngine(planId);

                // 3. Determine caseNumber and message
                let customMessage = "";
                let caseNumber = 0;

                const existingEarliestYear = existingResult?.earliestPurchaseYear || 0;

                if (result.earliestPurchaseYear === 0) {
                    customMessage = "Chi tiêu rất ấn tượng đấy 😀";
                    caseNumber = 4;
                } else if (result.earliestPurchaseYear > existingEarliestYear) {
                    customMessage = "Với những chi phí này, thời gian mua nhà sớm nhất của bạn sẽ bị lùi lại 🥵";
                    caseNumber = 3;
                } else {
                    customMessage = `Những khoản chi này càng đưa căn nhà mơ ước của bạn ra xa hơn, bạn chưa thể mua được nhà 😞`;
                    caseNumber = 5;
                }

                // 4. Update Cache and Plan
                await db.$transaction([
                    db.planReport.upsert({
                        where: { planId },
                        update: { projectionCache: result },
                        create: { planId, projectionCache: result },
                    }),
                    db.plan.update({
                        where: { id: planId },
                        data: { firstViableYear: result.earliestPurchaseYear }
                    })
                ]);

                await invalidateReportCache(planId);

                // Return only what the mobile app needs for the "Spending" feedback UI
                return NextResponse.json({
                    success: true,
                    section: "spending",
                    result: {
                        caseNumber: caseNumber,
                        message: customMessage,
                        earliestPurchaseYear: result.earliestPurchaseYear,
                        hasWorsened: previousFirstViableYear && result.earliestPurchaseYear > previousFirstViableYear
                    },
                    data: plan,
                    projection: result.projections
                });
            }
            case "familySupport": {
                const validatedData = updateFamilySupportSchema.parse(body.data);

                // 1. Update DB
                await updateFamilySupport(planId, userId, validatedData);

                // 2. Recalculate
                const result = await runProjectionWithEngine(planId);

                // 3. Determine caseNumber and message
                let customMessage = "";
                let caseNumber = 0;

                const existingEarliestYear = existingResult?.earliestPurchaseYear || 0;

                if (result.earliestPurchaseYear === 0) {
                    customMessage = "Tuyệt vời! Với sự hỗ trợ này, bạn có thể mua nhà ngay bây giờ! 🎉";
                    caseNumber = 1;
                } else if (existingEarliestYear > 0 && result.earliestPurchaseYear < existingEarliestYear) {
                    customMessage = "Sự hỗ trợ từ gia đình giúp bạn mua nhà sớm hơn! 🏡";
                    caseNumber = 2;
                } else {
                    customMessage = "Thông tin đã được cập nhật";
                    caseNumber = 0;
                }

                // 4. Update Cache and Plan
                await db.$transaction([
                    db.planReport.upsert({
                        where: { planId },
                        update: { projectionCache: result },
                        create: { planId, projectionCache: result },
                    }),
                    db.plan.update({
                        where: { id: planId },
                        data: { firstViableYear: result.earliestPurchaseYear }
                    })
                ]);

                await invalidateReportCache(planId);

                // Return only what the mobile app needs for the "Family Support" feedback UI
                return NextResponse.json({
                    success: true,
                    section: "familySupport",
                    result: {
                        caseNumber: caseNumber,
                        message: customMessage,
                        earliestPurchaseYear: result.earliestPurchaseYear,
                        hasImproved: existingEarliestYear > 0 && result.earliestPurchaseYear < existingEarliestYear
                    },
                    data: result,
                    projection: result.projections
                });
            }
            case "assumptions": {
                const validatedData = updateAssumptionsSchema.parse(body.data);

                // 1. Update DB
                await updateAssumptions(planId, userId, validatedData);

                // 2. Recalculate
                const result = await runProjectionWithEngine(planId);

                // 3. Update Cache and Plan
                await db.$transaction([
                    db.planReport.upsert({
                        where: { planId },
                        update: { projectionCache: result },
                        create: { planId, projectionCache: result },
                    }),
                    db.plan.update({
                        where: { id: planId },
                        data: { firstViableYear: result.earliestPurchaseYear }
                    })
                ]);

                await invalidateReportCache(planId);

                // Return only what the mobile app needs for the "Assumption" feedback UI
                return NextResponse.json({
                    success: true,
                    section: "assumptions",
                    result: {
                        earliestPurchaseYear: result.earliestPurchaseYear,
                        message: result.message,
                        isAffordable: result.isAffordable
                    },
                    data: result,
                    projection: result.projections
                });
            }
            default:
                throw new Error(`Unknown section: ${body.section}`);
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid data", details: error.format() }, { status: 400 });
        }
        if (error instanceof Error) {
            if (error.message.includes("Plan not found")) {
                return NextResponse.json({ error: error.message }, { status: 404 });
            }
            if (error.message.includes("Unknown section")) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
        }
        logger.error(`[API_SECTION_PATCH]`, { error: String(error) });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
