import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import logger from "@/lib/logger";
import { z } from "zod";
import { db } from "@/lib/db";
import { OnboardingSectionState } from "@prisma/client";
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
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
    try {
        // Use hybrid auth verification
        const { verifyMobileToken } = await import('@/lib/mobileAuth');
        const userId = await verifyMobileToken(req);

        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { planId } = await params;
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

                // Check for changes
                const currentSpendingData = {
                    monthlyNonHousingDebt: plan.monthlyNonHousingDebt,
                    currentAnnualInsurancePremium: plan.currentAnnualInsurancePremium,
                    hasNewChild: plan.hasNewChild,
                    yearToHaveChild: plan.yearToHaveChild,
                    monthlyChildExpenses: plan.monthlyChildExpenses,
                };

                const areValuesEqual = (val1: any, val2: any) => {
                    if ((val1 === null || val1 === undefined) && (val2 === null || val2 === undefined)) return true;
                    return val1 === val2;
                };

                const hasChanged = Object.keys(validatedData).some(key =>
                    !areValuesEqual(validatedData[key as keyof typeof validatedData], currentSpendingData[key as keyof typeof currentSpendingData])
                );

                let result;
                let customMessage = "";
                let caseNumber = 0;
                let hasWorsened = false;

                if (!hasChanged) {
                    // Use existing result if no changes
                    result = {
                        earliestPurchaseYear: existingResult?.earliestPurchaseYear || 0,
                        projections: existingResult && 'projections' in existingResult ? existingResult.projections : [], // Fallback if projections missing
                        isAffordable: existingResult?.isAffordable || false
                    };

                    // Logic for unchanged data: Check if on track (Case 1) or off track (Case 2)
                    if (result.earliestPurchaseYear !== 0) {
                        customMessage = "Ấn tượng đấy 😀"; // Case 1: Good & Unchanged
                        caseNumber = 1;
                    } else {
                        customMessage = "Rất tiếc, bạn sẽ không thể mua được nhà vào năm mong muốn."; // Case 2: Bad & Unchanged
                        caseNumber = 2;
                    }

                } else {
                    // 1. Update DB
                    await updateSpending(planId, userId, validatedData);

                    // 2. Recalculate
                    result = await runProjectionWithEngine(planId);

                    // 3. Determine caseNumber and message for CHANGED data
                    const existingEarliestYear = existingResult?.earliestPurchaseYear || 0;

                    if (result.earliestPurchaseYear !== 0 && existingEarliestYear !== 0 && result.earliestPurchaseYear === existingEarliestYear) {
                        customMessage = "Chi tiêu rất ấn tượng đấy 😀";
                        caseNumber = 4;
                    } else if (result.earliestPurchaseYear > existingEarliestYear) {
                        customMessage = "Với những chi phí này, thời gian mua nhà sớm nhất của bạn sẽ bị lùi lại 🥵";
                        caseNumber = 3;
                        hasWorsened = true;
                    } else {
                        customMessage = `Những khoản chi này càng đưa căn nhà mơ ước của bạn ra xa hơn, bạn chưa thể mua được nhà 😞`;
                        caseNumber = 5;
                    }
                }

                if (hasChanged) {
                    await db.$transaction([
                        db.planReport.upsert({
                            where: { planId },
                            update: { projectionCache: result as any },
                            create: { planId, projectionCache: result as any },
                        }),
                        db.plan.update({
                            where: { id: planId },
                            data: { firstViableYear: result.earliestPurchaseYear }
                        }),
                        db.onboardingProgress.updateMany({
                            where: { planId },
                            data: { spendingState: OnboardingSectionState.COMPLETED }
                        })
                    ]);
                    await invalidateReportCache(planId);
                } else {
                    // Even if unchanged, ensure progress is marked completed
                    await db.onboardingProgress.updateMany({
                        where: { planId },
                        data: { spendingState: OnboardingSectionState.COMPLETED }
                    });
                }

                // Return only what the mobile app needs for the "Spending" feedback UI
                return NextResponse.json({
                    success: true,
                    section: "spending",
                    result: {
                        caseNumber: caseNumber,
                        message: customMessage,
                        earliestPurchaseYear: result.earliestPurchaseYear,
                        hasWorsened: hasWorsened
                    },
                    data: plan,
                    projection: (result as any).projections || []
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
                    db.plan.update({
                        where: { id: planId },
                        data: { firstViableYear: result.earliestPurchaseYear }
                    }),
                    db.onboardingProgress.updateMany({
                        where: { planId },
                        data: { familySupportState: OnboardingSectionState.COMPLETED }
                    })
                ]);

                await invalidateReportCache(planId);

                // Return only what the mobile app needs for the "Family Support" feedback UI
                return NextResponse.json({
                    success: true,
                    section: "familySupport",
                    result: {
                        caseNumber: caseNumber,
                        customMessage: customMessage,
                        earliestPurchaseYear: result.earliestPurchaseYear,
                        hasImproved: existingEarliestYear > 0 && result.earliestPurchaseYear < existingEarliestYear
                    },
                    data: plan,
                    projection: result.projections
                });
            }
            case "assumptions": {
                const validatedData = updateAssumptionsSchema.parse(body.data);

                // 1. Update DB
                await updateAssumptions(planId, userId, validatedData);

                // 2. Recalculate
                const result = await runProjectionWithEngine(planId);

                // 3. Determine caseNumber and message
                let customMessage = "";
                let caseNumber = 0;
                let message = "";

                // Calculate years for case classification
                const currentYear = new Date().getFullYear();
                const confirmedYear = plan.confirmedPurchaseYear || 0;
                const projectedYear = result.earliestPurchaseYear;

                // Classify into 5 cases based on user requirements
                if (projectedYear === 0) {
                    // Case 4: Mong muốn là x nhưng không có được năm sớm nhất (earliestYear =0)
                    caseNumber = 4;
                    customMessage = "Mọi kế hoạch lớn đều cần sự tinh chỉnh. Bạn có muốn trò chuyện 15 phút miễn phí với chuyên gia của Finful để cùng tìm ra giải pháp không?";
                } else if (projectedYear < confirmedYear) {
                    // Case 1: mong muốn là x nhưng có thể mua sớm hơn x
                    // Prioritize Case 1 over Case 5 to ensure "Better" status is reported even if within 1 year.
                    caseNumber = 1;
                    customMessage = `Bạn có thể mua nhà vào năm ${confirmedYear} như mong muốn, thậm chí có thể mua sớm hơn vào năm ${projectedYear}!`;
                } else if (projectedYear - currentYear <= 1) {
                    // Case 5: Năm sớm nhất - hiện tại <= 1
                    // Applies if not Case 1 (Better). Covers Case 2 (Worse) and Case 3 (Same) if they are within 1 year.
                    caseNumber = 5;
                    customMessage = "Câu hỏi bây giờ là: “Đâu là chiến lược hành động tốt nhất?”. Để trả lời câu hỏi này, một buổi hoạch định chiến lược 1-1 với chuyên gia của Finful là bước đi cần thiết.";
                } else if (projectedYear > confirmedYear) {
                    // Case 2: Mong muốn là x nhưng thực tế là năm sớm nhất lại lớn hơn x
                    caseNumber = 2;
                    customMessage = `Bạn có thể mua nhà sớm nhất vào năm ${projectedYear}`;
                } else {
                    // Case 3: Mong muốn là x và thực tế cũng thế
                    caseNumber = 3;
                    customMessage = `Bạn hoàn toàn có thể mua nhà vào năm ${confirmedYear} như mong muốn của mình`;
                }

                if (caseNumber === 4) {
                    message = "Bạn chưa thể mua được căn nhà như mong muốn";
                } else if (caseNumber === 5) {
                    message = "Bạn có thể mua được nhà trong vòng 1 năm tới";
                } else {
                    message = "Kế hoạch chinh phục căn nhà đầu tiên của bạn đã sẵn sàng";
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
                    }),
                    db.onboardingProgress.updateMany({
                        where: { planId },
                        data: { assumptionState: OnboardingSectionState.COMPLETED }
                    })
                ]);

                await invalidateReportCache(planId);

                // Return only what the mobile app needs for the "Assumption" feedback UI
                return NextResponse.json({
                    success: true,
                    section: "assumptions",
                    result: {
                        caseNumber: caseNumber,
                        customMessage: customMessage,
                        message: message,
                        earliestPurchaseYear: result.earliestPurchaseYear,
                        isAffordable: result.isAffordable
                    },
                    data: plan,
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
        // Temporary debug response
        return NextResponse.json({
            error: "Internal Server Error",
            details: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
