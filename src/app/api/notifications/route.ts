import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/services/notificationService';

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user's notifications
 *     tags: [Notifications]
 *     responses:
 *       '200': { description: "A list of notifications." }
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Giới hạn số lượng thông báo trả về
    });

    return NextResponse.json(notifications);

  } catch (error) {
    console.error('[API_GET_NOTIFICATIONS_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Create a new notification
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               relatedUrl:
 *                 type: string
 *     responses:
 *       '201': { description: "Notification created successfully." }
 *       '400': { description: "Bad request. Missing title or body." }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, relatedUrl } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    const newNotification = await createNotification({
      userId,
      title,
      body,
      relatedUrl,
    });

    return NextResponse.json(newNotification, { status: 201 });

  } catch (error) {
    console.error('[API_CREATE_NOTIFICATION_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}