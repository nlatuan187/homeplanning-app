import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const registerSchema = z.object({
  token: z.string().min(1, "Device token is required"),
  platform: z.enum(['ios', 'android', 'web']),
});

/**
 * @swagger
 * /api/notifications/register-device:
 *   post:
 *     summary: Register a device for push notifications
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, platform]
 *             properties:
 *               token:
 *                 type: string
 *                 description: The unique push token from FCM/APNS.
 *               platform:
 *                 type: string
 *                 enum: [ios, android, web]
 *     responses:
 *       '200': { description: "Device registered successfully." }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.format() }, { status: 400 });
    }

    const { token, platform } = validation.data;

    // Dùng upsert để nếu token đã tồn tại thì chỉ cập nhật, nếu chưa thì tạo mới
    await db.deviceToken.upsert({
      where: { token },
      update: { userId, platform, updatedAt: new Date() },
      create: { token, userId, platform },
    });

    return NextResponse.json({ success: true, message: 'Device registered successfully' });

  } catch (error) {
    console.error('[API_REGISTER_DEVICE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}