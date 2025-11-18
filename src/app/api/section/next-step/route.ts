import { NextResponse } from 'next/server';
import { quickCheckStepOrder } from '@/lib/quickcheck-flow-definition';
import { familySupportStepOrder } from '@/lib/family-support-flow-definition'; // New import
import { spendingStepOrder } from '@/lib/spending-flow-definition'; // New import
import { z } from 'zod';

// Define a map to hold all section flows
const sectionFlows = {
  quickCheck: quickCheckStepOrder,
  familySupport: familySupportStepOrder,
  spending: spendingStepOrder,
};

// Update schema to accept the new sections
const requestBodySchema = z.object({
  currentSection: z.enum(['quickCheck', 'familySupport', 'spending']),
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
 *                 enum: [quickCheck, familySupport, spending]
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
    let requestedIndex = parseInt(searchParams.get('index') || '1', 10);

    const body = await request.json();
    
    const validation = requestBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.flatten() }, { status: 400 });
    }
    const { answers, currentSection } = validation.data;

    const stepOrder = sectionFlows[currentSection];
    if (!stepOrder) {
      return NextResponse.json({ error: `Unsupported section: ${currentSection}` }, { status: 400 });
    }

    // --- NEW LOGIC ---

    // 1. Build the path of VISIBLE steps based on the user's answers.
    const visibleStepsPath: { type: string; payload: any; masterIndex: number }[] = [];
    stepOrder.forEach((step, index) => {
      const masterIndex = index + 1;
      let stepPayload;
      if (typeof step.payload === 'function') {
        stepPayload = step.payload(answers);
      } else {
        stepPayload = step.payload;
      }

      // If the payload is not null, it's a visible step.
      if (stepPayload) {
        visibleStepsPath.push({
          ...step,
          payload: stepPayload,
          masterIndex: masterIndex, // Keep track of the original index
        });
      }
    });

    const totalStep = visibleStepsPath.length;

    // 2. Find the next valid step in the visible path.
    let nextStepInPath = null;
    let currentVisibleStepIndex = -1; // This will be our new, consistent currentStep

    for (let i = 0; i < visibleStepsPath.length; i++) {
      // Find the first visible step whose masterIndex is at or after the requested index.
      if (visibleStepsPath[i].masterIndex >= requestedIndex) {
        nextStepInPath = visibleStepsPath[i]; 
        currentVisibleStepIndex = i + 1; // The 1-based index within the VISIBLE path
        break;
      }
    }

    // 3. If no next step is found, the section is complete.
    if (!nextStepInPath) {
      return NextResponse.json({
        stepType: 'FINAL',
        status: 'completed',
        message: 'Section completed.',
      });
    }

    // 4. Build and return the consistent response.
    const response = {
      currentStep: currentVisibleStepIndex, // User-friendly step number
      totalStep: totalStep,                 // Consistent total number
      stepType: nextStepInPath.type,
      status: 'activate',
      payload: nextStepInPath.payload,
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
