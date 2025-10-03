import * as admin from 'firebase-admin';
import { db } from '@/lib/db';

// Khởi tạo Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

interface NotificationPayload {
  title: string;
  body: string;
  data?: { [key: string]: string }; // Dữ liệu đính kèm, ví dụ: URL để deep-link
}

interface CreateNotificationData {
  userId: string;
  title: string;
  body: string;
  relatedUrl?: string;
}

/**
 * Creates a new notification in the database.
 * @param data The notification data.
 * @returns The created notification.
 */
export async function createNotification(data: CreateNotificationData) {
  const notification = await db.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      body: data.body,
      relatedUrl: data.relatedUrl,
    },
  });
  return notification;
}

export async function sendNotification(userId: string, payload: NotificationPayload) {
  // 1. Lấy tất cả device tokens của người dùng từ DB
  const userTokens = await db.deviceToken.findMany({
    where: { userId },
    select: { token: true },
  });

  if (userTokens.length === 0) {
    console.log(`No device tokens found for user ${userId}.`);
    return;
  }

  const tokens = userTokens.map(t => t.token);

  // 2. Chuẩn bị message để gửi qua FCM
  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    apns: { // Cấu hình riêng cho iOS
        payload: {
            aps: {
                sound: 'default',
            },
        },
    },
  };

  try {
    // 3. Gửi thông báo
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log('Successfully sent message:', response);
    
    // (Tùy chọn) Xử lý các token đã hết hạn
    const invalidTokens: string[] = [];
    response.responses.forEach((result, index) => {
        if (!result.success) {
            const errorCode = result.error?.code;
            if (errorCode === 'messaging/registration-token-not-registered' ||
                errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/invalid-argument') { // <-- THÊM ĐIỀU KIỆN NÀY
                invalidTokens.push(tokens[index]);
            }
        }
    });

    if (invalidTokens.length > 0) {
        await db.deviceToken.deleteMany({
            where: { token: { in: invalidTokens } },
        });
        console.log('Removed invalid tokens:', invalidTokens);
    }

  } catch (error) {
    console.error('Error sending message:', error);
  }

  // 4. Lưu thông báo vào lịch sử bằng cách gọi hàm mới
  await createNotification({
    userId,
    title: payload.title,
    body: payload.body,
    relatedUrl: payload.data?.url,
  });
}