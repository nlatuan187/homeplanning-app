import { NextResponse } from 'next/server';
import { onboardingSections } from '@/lib/onboarding-question';

/**
 * @swagger
 * /onboarding/section/{sectionId}:
 *   get:
 *     summary: Get onboarding section configuration
 *     description: Retrieves the questions and configuration for a specific section of the onboarding process.
 *     tags: [Onboarding]
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the onboarding section (e.g., 'quickCheckPart1', 'familySupport').
 *     responses:
 *       '200':
 *         description: Successful response with the section configuration.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSection'
 *       '404':
 *         description: Section not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Section 'some-section' not found."
 */
export async function GET(
  request: Request,
  { params }: { params: { sectionId: string } }
) {
  const { sectionId } = params;

  // Lấy cấu hình câu hỏi từ object đã định nghĩa
  const sectionConfig = onboardingSections[sectionId];

  if (sectionConfig) {
    // Nếu tìm thấy, trả về dữ liệu JSON
    return NextResponse.json(sectionConfig);
  } else {
    // Nếu không tìm thấy, trả về lỗi 404
    return NextResponse.json({ error: `Section '${sectionId}' not found.` }, { status: 404 });
  }
}
