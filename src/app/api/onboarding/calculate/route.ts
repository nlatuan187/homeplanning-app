import { NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateOnboardingProjection } from '@/actions/calculateOnboardingProjection';
import { OnboardingPlanState } from '@/components/onboarding/types';

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectionRow:
 *       type: object
 *       properties:
 *         year:
 *           type: integer
 *           description: "The calendar year for this row of data."
 *           example: 2025
 *         age:
 *           type: integer
 *           description: "User's age in that year."
 *           example: 30
 *         isAffordable:
 *           type: boolean
 *           description: "Whether the house is affordable in this year."
 *           example: true
 *         affordabilityShortfall:
 *           type: number
 *           description: "The amount of money missing to afford the house. 0 if affordable."
 *           example: 0
 *     QuickCheckResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         caseNumber:
 *           type: integer
 *           description: "1: Feasible, 2: Feasible Later, 3: Not Feasible"
 *         message:
 *           type: string
 *         isAffordable:
 *           type: boolean
 *         affordableYear:
 *           type: integer
 *           nullable: true
 *         projectionData:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProjectionRow'
 */

// Schema để validate dữ liệu đầu vào
const quickCheckSchema = z.object({
  yearsToPurchase: z.number().int().min(new Date().getFullYear()),
  targetHousePriceN0: z.number().positive(),
  monthlyLivingExpenses: z.number().nonnegative(),
  initialSavings: z.number().nonnegative().optional(),
  userMonthlyIncome: z.number().nonnegative().optional(),
  coApplicantMonthlyIncome: z.number().nonnegative().optional(),
  monthlyOtherIncome: z.number().nonnegative().optional(),
  hasCoApplicant: z.boolean().optional(),
});

/**
 * @swagger
 * /api/onboarding/calculate:
 *   post:
 *     summary: Calculate a temporary quick check result
 *     description: |
 *       Calculates a preliminary home buying projection based on initial user input.
 *       Returns categorized results (Case 1, 2, 3) based on affordability.
 *       This endpoint is PUBLIC.
 *     tags: [Onboarding]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - yearsToPurchase
 *               - targetHousePriceN0
 *               - monthlyLivingExpenses
 *             properties:
 *               yearsToPurchase:
 *                 type: integer
 *                 example: 2028
 *               targetHousePriceN0:
 *                 type: number
 *                 example: 3.5
 *               monthlyLivingExpenses:
 *                 type: number
 *                 example: 20
 *               hasCoApplicant:
 *                 type: boolean
 *                 example: false
 *               initialSavings:
 *                 type: number
 *                 example: 500
 *               userMonthlyIncome:
 *                 type: number
 *                 example: 40
 *     responses:
 *       '200':
 *         description: Calculation successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuickCheckResult'
 *       '400':
 *         description: Bad Request.
 *       '500':
 *         description: Internal Server Error.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validate dữ liệu đầu vào
    const validation = quickCheckSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input data", details: validation.error.format() }, { status: 400 });
    }

    const onboardingData: Partial<OnboardingPlanState> = validation.data;

    // 2. Gọi logic tính toán cốt lõi
    const projectionResult = await calculateOnboardingProjection(onboardingData);

    if (!projectionResult.success) {
      return NextResponse.json({ error: projectionResult.error }, { status: 400 });
    }

    const yearsToPurchase = onboardingData.yearsToPurchase!;
    const affordableYear = projectionResult.earliestAffordableYear;

    let caseNumber = 3;
    let message = "Chưa khả thi";
    let isAffordable = false;

    // Logic phân loại Case (1-3)
    if (affordableYear) {
      if (affordableYear <= yearsToPurchase) {
        // Case 1: Mua được sớm hơn hoặc đúng hạn
        caseNumber = 1;
        message = "Kế hoạch hoàn toàn khả thi";
        isAffordable = true;
      } else {
        // Case 2: Mua được nhưng trễ hơn
        caseNumber = 2;
        message = `Chưa khả thi, nhưng bạn có thể mua vào năm ${affordableYear}`;
        isAffordable = false; // Theo logic UI thì hiện tại chưa mua được vào năm mong muốn
      }
    } else {
      // Case 3: Không tìm được năm mua được
      caseNumber = 3;
      message = "Chưa khả thi";
      isAffordable = false;
    }

    // 3. Trả về kết quả
    return NextResponse.json({
      success: true,
      caseNumber,
      message,
      isAffordable,
      affordableYear,
      projectionData: projectionResult.projectionData
    }, { status: 200 });

  } catch (error) {
    console.error('[API_ONBOARDING_CALCULATE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}