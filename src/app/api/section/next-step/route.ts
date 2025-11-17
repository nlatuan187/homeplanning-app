import { NextResponse } from 'next/server';
import { quickCheckStepOrder } from '@/lib/quickcheck-flow-definition';
import { z } from 'zod';

// Define a schema for validating the incoming request body
const requestBodySchema = z.object({
  currentSection: z.literal('quickCheck'),
  answers: z.record(z.any()), // Allow answers to be any object
});

/**
 * @swagger
 * /api/section/next-step:
 *   post:
 *     summary: Get the next step in a given section flow.
 *     description: >
 *       Provides a step-by-step progression through a defined flow, such as 'quickCheck'.
 *       The client sends all accumulated answers, and the server returns the next single question or educational content.
 *     tags:
 *       - Section Flow
 *     parameters:
 *       - in: query
 *         name: index
 *         schema:
 *           type: integer
 *         required: true
 *         description: The 1-based index of the next step to retrieve (starts at 1).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentSection:
 *                 type: string
 *                 enum: [quickCheck]
 *                 description: The section flow being processed.
 *               answers:
 *                 type: object
 *                 description: An object containing all answers collected so far, with question keys as properties.
 *                 example:
 *                   yearsToPurchase: 2025
 *                   targetHousePriceN0: 3000
 *     responses:
 *       '200':
 *         description: Successfully retrieved the next step.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentStep:
 *                   type: integer
 *                   description: The 1-based index of the step being returned.
 *                 totalStep:
 *                   type: integer
 *                   description: The total number of steps in this flow (dynamically calculated).
 *                 stepType:
 *                   type: string
 *                   enum: [QUESTION, EDUCATION, FINAL]
 *                   description: The type of the current step.
 *                 status:
 *                   type: string
 *                   enum: [activate, completed]
 *                   description: The status of the current step.
 *                 payload:
 *                   type: object
 *                   description: The content for the current step (question details, educational text, etc.).
 *       '400':
 *         description: Bad Request - Invalid input, such as a missing or malformed request body or an unsupported section.
 *       '500':
 *         description: Internal Server Error.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Read the 1-based index from the query, defaulting to 1.
    let currentIndex = parseInt(searchParams.get('index') || '1', 10);

    const body = await request.json();
    
    const validation = requestBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.flatten() }, { status: 400 });
    }
    const { answers } = validation.data;

    // --- Dynamic Total Step Calculation ---
    let totalStep = quickCheckStepOrder.length;
    const marketAnalysisStepDefinition = quickCheckStepOrder.find(step => step.id === 'marketAnalysis');

    if (marketAnalysisStepDefinition && typeof marketAnalysisStepDefinition.payload === 'function') {
      const analysisPayload = marketAnalysisStepDefinition.payload(answers);
      if (!analysisPayload) {
        totalStep--;
      }
    }

    let finalPayload;
    let nextStepDefinition;

    // Use a while loop with 1-based index logic
    while (currentIndex <= quickCheckStepOrder.length) {
      // Convert 1-based index to 0-based for array access
      const arrayIndex = currentIndex - 1;
      nextStepDefinition = quickCheckStepOrder[arrayIndex];

      if (typeof nextStepDefinition.payload === 'function') {
        finalPayload = nextStepDefinition.payload(answers);
      } else {
        finalPayload = nextStepDefinition.payload;
      }

      if (!(nextStepDefinition.type === 'EDUCATION' && !finalPayload)) {
        break; // Found a valid step, break the loop.
      }

      currentIndex++; // If skippable, increment and check the next step.
    }

    // Check if the loop finished because all remaining steps were skipped or the index was out of bounds.
    if (currentIndex > quickCheckStepOrder.length || !nextStepDefinition) {
      return NextResponse.json({
        stepType: 'FINAL',
        status: 'completed',
        message: 'Quick check completed. Ready to calculate.',
      });
    }

    const response = {
      currentStep: currentIndex, // Return the 1-based index
      totalStep: totalStep,
      stepType: nextStepDefinition.type,
      status: 'activate',
      payload: finalPayload,
    };

    return NextResponse.json(response);

  } catch (error) {
    let requestBodyForLogging = {};
    try {
        requestBodyForLogging = await request.clone().json();
    } catch {
        requestBodyForLogging = { error: "Could not parse request body" };
    }
    console.error('[API /section/next-step ERROR]', { 
        errorMessage: error instanceof Error ? error.message : 'An unknown error occurred',
        errorStack: error instanceof Error ? error.stack : null,
        requestUrl: request.url,
        requestBody: requestBodyForLogging,
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
