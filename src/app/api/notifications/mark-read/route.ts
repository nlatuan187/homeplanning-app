import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const markReadSchema = z.object({
  notificationIds: z.array(z.string()).min(1),
});

/**
 * @swagger
 * /notifications/mark-read:
 *   post:
 *     summary: Mark notifications as read
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       '200': { description: "Notifications marked as read." }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = markReadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.format() }, { status: 400 });
    }

    await db.notification.updateMany({
      where: {
        id: { in: validation.data.notificationIds },
        userId: userId, // Đảm bảo người dùng chỉ có thể cập nhật thông báo của chính mình
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API_MARK_READ_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}