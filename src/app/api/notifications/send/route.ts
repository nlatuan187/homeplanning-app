import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendNotification } from '@/lib/services/notificationService';
import { db } from '@/lib/db';

/**
 * @swagger
 * /notifications/send:
 *   post:
 *     summary: Sends a notification to a specific user
 *     description: This endpoint triggers a push notification to a user's devices and saves the notification to the database. It requires authentication and administrator privileges.
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - title
 *               - body
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user to send the notification to.
 *               title:
 *                 type: string
 *                 description: The title of the notification.
 *               body:
 *                 type: string
 *                 description: The main content of the notification.
 *               relatedUrl:
 *                 type: string
 *                 description: (Optional) A URL to navigate to when the notification is clicked.
 *     responses:
 *       '200':
 *         description: Notification sent successfully.
 *       '400':
 *         description: Bad Request - Missing required fields.
 *       '401':
 *         description: Unauthorized - User is not authenticated.
 *       '403':
 *         description: Forbidden - User is not an administrator (logic to be implemented).
 *       '404':
 *         description: User not found.
 *       '500':
 *         description: Internal Server Error.
 */
export async function POST(req: Request) {
  try {
    // Step 1: Authenticate the request
    const { userId: authedUserId } = await auth();
    if (!authedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 2: Parse and validate the request body
    const { userId: targetUserId, title, body, relatedUrl } = await req.json();

    if (!targetUserId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, and body are required.' },
        { status: 400 }
      );
    }

    // Step 3: Verify the target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
    }
    
    // Step 4: Prepare and send the notification
    await sendNotification(targetUserId, {
      title,
      body,
      data: relatedUrl ? { url: relatedUrl } : {},
    });

    return NextResponse.json({ message: 'Notification sent successfully.' });

  } catch (error) {
    console.error('[API_SEND_NOTIFICATION_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
