// src/app/api/onboarding/calculate/route.ts
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
 *         isAffordable:
 *           type: boolean
 *         affordableYear:
 *           type: integer
 *           nullable: true
 *         message:
 *           type: string
 *         projectionData:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProjectionRow'
 */

// Schema để validate dữ liệu đầu vào (có thể tái sử dụng từ nơi khác)
const quickCheckSchema = z.object({
  yearsToPurchase: z.number().int().min(new Date().getFullYear()),
  targetHousePriceN0: z.number().positive(),
  monthlyLivingExpenses: z.number().nonnegative(),
  initialSavings: z.number().nonnegative().optional(),
  userMonthlyIncome: z.number().nonnegative().optional(),
  coApplicantMonthlyIncome: z.number().nonnegative().optional(),
  monthlyOtherIncome: z.number().nonnegative().optional(),
});

/**
 * @swagger
 * /onboarding/calculate:
 *   post:
 *     summary: Calculate a temporary quick check result
 *     description: |
 *       Calculates a preliminary home buying projection based on initial user input.
 *       This endpoint is PUBLIC and does NOT require authentication.
 *       It does NOT save any data to the database.
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
 *                 description: "The absolute year the user plans to purchase the house (e.g., 2027)."
 *                 example: 2028
 *               targetHousePriceN0:
 *                 type: number
 *                 description: "The target house price in billions of VND (e.g., 3.5 for 3.5 tỷ)."
 *                 example: 3.5
 *               monthlyLivingExpenses:
 *                 type: number
 *                 description: "The user's monthly living expenses in millions of VND."
 *                 example: 20
 *               hasCoApplicant:
 *                 type: boolean
 *                 description: "Does the user have a co-applicant?"
 *                 example: false
 *               initialSavings:
 *                 type: number
 *                 description: "Initial savings in millions of VND."
 *                 example: 500
 *               userMonthlyIncome:
 *                 type: number
 *                 description: "User's monthly income in millions of VND."
 *                 example: 40
 *               targetHouseType:
 *                 type: string
 *                 example: "Chung cư"
 *               targetLocation:
 *                 type: string
 *                 example: "Hà Nội"
 *     responses:
 *       '200':
 *         description: Calculation successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuickCheckResult'
 *       '400':
 *         description: Bad Request - Invalid input data.
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

    // 2. Gọi logic tính toán cốt lõi (từ Server Action của bạn)
    const projectionResult = await calculateOnboardingProjection(onboardingData);
    console.log("projectionResult", projectionResult);

    // 3. Trả về kết quả
    return NextResponse.json(projectionResult, { status: 200 });

  } catch (error) {
    console.error('[API_ONBOARDING_CALCULATE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}