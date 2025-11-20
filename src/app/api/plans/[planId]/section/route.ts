import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import logger from "@/lib/logger";
import { z } from "zod";
import {
    updateSpending, updateSpendingSchema,
    updateAssumptions, updateAssumptionsSchema,
    invalidateReportCache
} from "@/lib/services/planService";
import { runProjectionWithEngine } from "@/actions/projectionHelpers";

// Schema để validate phần thân của request
const bodySchema = z.object({
    section: z.enum(["spending", "assumptions"]), // Removed familySupport - now merged into spending
    data: z.any(),
});

/**
 * @swagger
 * /api/plans/{planId}/section:
 *   patch:
 *     summary: Update a specific section of a plan
 *     description: A unified endpoint to update different sections of a financial plan. Family support fields are now included in the spending section.
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
 *                 enum: [spending, assumptions]
 *                 description: The name of the section to update.
 *               data:
 *                 type: object
 *                 description: "The payload containing the fields to update. The structure depends on the 'section' value."
 *             example:
 *               section: "spending"
 *               data: { 
 *                 "monthlyNonHousingDebt": 500,
 *                 "hasFamilySupport": true, 
 *                 "familySupportAmount": 1000 
 *               }
 *     responses:
 *       '200': { description: "Section updated successfully." }
 *       '400': { description: "Bad Request - Invalid input data or unknown section." }
 *       # ... other responses
 */
export async function PATCH(req: NextRequest, { params }: { params: { planId: string } }) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { planId } = params;
        const body = await bodySchema.parse(await req.json());

        let result;

        switch (body.section) {
            case "spending": {
                const validatedData = updateSpendingSchema.parse(body.data);
                result = await updateSpending(planId, userId, validatedData);
                await invalidateReportCache(planId);
                break;
            }
            case "assumptions": {
                const validatedData = updateAssumptionsSchema.parse(body.data);
                result = await updateAssumptions(planId, userId, validatedData);
                await invalidateReportCache(planId);
                break;
            }
            default:
                throw new Error(`Unknown section: ${body.section}`);
        }

        // Run projection to get the latest results
        const projection = await runProjectionWithEngine(planId);

        logger.info(`Updated section '${body.section}' for plan`, { planId, userId });

        return NextResponse.json({
            success: true,
            data: result,
            projection: projection
        });

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
