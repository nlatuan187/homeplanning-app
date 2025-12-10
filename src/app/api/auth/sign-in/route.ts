import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.CLERK_SECRET_KEY || 'mobile_auth_secret_fallback_12345';

/**
 * @swagger
 * /api/auth/sign-in:
 *   post:
 *     summary: Sign in a user manually
 *     description: Signs in a user in the Clerk system using email and password. Returns ticket, sessionToken, and customToken.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: 'string', format: 'email' }
 *               password: { type: 'string' }
 *     responses:
 *       '200':
 *         description: User signed in successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticket:
 *                   type: string
 *                   description: Sign-in ticket
 *                 userId:
 *                   type: string
 *                   description: User ID
 *                 url:
 *                   type: string
 *                   description: Optional URL for web redirect
 *                 token:
 *                   type: string
 *                   description: Session token (JWT) for authentication (Short-lived)
 *                 sessionData:
 *                   type: object
 *                   description: Full session data from Clerk
 *       '401':
 *         description: Invalid credentials.
 *       '500':
 *         description: Internal Server Error.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    console.log(`Attempting to sign in with email: "${email}"`);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Tìm người dùng bằng email
    const userList = await (await clerkClient()).users.getUserList({ emailAddress: [email] });

    if (userList.data.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = userList.data[0];

    // 2. Xác thực mật khẩu
    const verification = await (await clerkClient()).users.verifyPassword({
      userId: user.id,
      password: password,
    });

    // Log chi tiết phản hồi từ Clerk để tìm nguyên nhân
    console.log('Clerk verification response:', verification);

    if (!verification.verified) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 3. Tạo Custom JWT (Long-lived) cho Mobile App
    const jti = crypto.randomUUID();
    const payload = {
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      jti: jti,
    };

    // Explicitly use HS256
    const customToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '30d',
      algorithm: 'HS256'
    });

    console.log(`[SIGN_IN] Generated custom token for user ${user.id}`);

    // 4. Tạo Sign-In Token cho mobile app (hoạt động cả dev và production)
    // Mobile app sẽ dùng token này để authenticate thông qua Clerk SDK
    const signInToken = await (await clerkClient()).signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 2592000, // Token hết hạn sau 30 ngày
    });

    // 5. Exchange ticket để lấy sessionToken ngay lập tức
    const fapiUrl = 'https://clerk.muanha.finful.co/v1/client/sign_ins?';

    console.log(`Exchanging ticket at ${fapiUrl}...`);

    const exchangeResponse = await fetch(fapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        strategy: 'ticket',
        ticket: signInToken.token,
      }),
    });

    const exchangeData = await exchangeResponse.json();

    if (!exchangeResponse.ok) {
      console.error('Clerk FAPI Error:', exchangeData);
      // Vẫn trả về ticket và customToken nếu exchange thất bại
      return NextResponse.json({
        ticket: signInToken.token,
        userId: user.id,
        url: signInToken.url,
        customToken: customToken, // Vẫn có token này để dùng
        exchangeError: 'Failed to exchange ticket for session token',
        exchangeDetails: exchangeData
      });
    }

    // Lấy session token từ response
    const sessionId = exchangeData.client?.sessions?.[0]?.id;
    const lastActiveSessionId = exchangeData.client?.last_active_session_id;

    // Tìm session token từ các sessions
    let sessionToken = null;
    if (exchangeData.client?.sessions) {
      const activeSession = exchangeData.client.sessions.find(
        (s: any) => s.id === (lastActiveSessionId || sessionId)
      );
      sessionToken = activeSession?.last_active_token?.jwt;
    }

    return NextResponse.json({
      userId: user.id,
      token: customToken, // Token dài hạn (30 ngày)
    });

  } catch (error) {
    console.error('Error signing in user:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}