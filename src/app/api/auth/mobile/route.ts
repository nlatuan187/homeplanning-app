import { NextResponse } from 'next/server';
import { clerkClient, auth, currentUser } from '@clerk/nextjs/server';

/**
 * @swagger
 * /api/auth/mobile:
 *   post:
 *     summary: Authenticate mobile user with Clerk
 *     description: |
 *       Authenticates mobile users using Clerk's headless authentication.
 *       Returns user information and sign-in token for mobile app usage.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 description: User's password
 *                 example: "password123"
 *     responses:
 *       '200':
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 userId:
 *                   type: string
 *                   description: Clerk user ID
 *                 email:
 *                   type: string
 *                   description: User's email address
 *                 firstName:
 *                   type: string
 *                   description: User's first name
 *                 lastName:
 *                   type: string
 *                   description: User's last name
 *                 token:
 *                   type: string
 *                   description: Session token (JWT) for authentication
 *                 ticket:
 *                   type: string
 *                   description: Sign-in ticket (needs to be exchanged for session token)
 *                 url:
 *                   type: string
 *                   description: URL for sign-in (optional)
 *       '400':
 *         description: Bad Request - Missing email or password.
 *       '401':
 *         description: Authentication failed - Invalid credentials.
 *       '500':
 *         description: Internal server error
 */
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Tìm người dùng bằng email
    const { data: userList } = await (await clerkClient()).users.getUserList({ emailAddress: [email] });

    if (userList.length === 0) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    const user = userList[0];

    // 2. Xác thực mật khẩu
    const verification = await (await clerkClient()).users.verifyPassword({
      userId: user.id,
      password: password,
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    // 3. Tạo Sign-In Token cho mobile app (hoạt động cả dev và production)
    // Mobile app sẽ dùng token này để authenticate thông qua Clerk SDK
    const signInToken = await (await clerkClient()).signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 2592000, // Token hết hạn sau 30 ngày
    });

    // 4. Exchange ticket để lấy sessionToken ngay lập tức
    // Mobile app cần session token (JWT) để gọi các API khác, không phải ticket (chỉ dùng 1 lần)
    const fapiUrl = 'https://clerk.muanha.finful.co/v1/client/sign_ins?';

    console.log(`[MOBILE_AUTH] Exchanging ticket at ${fapiUrl}...`);

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
      console.error('[MOBILE_AUTH] Clerk FAPI Error:', exchangeData);
      // Fallback: Trả về ticket nếu exchange thất bại (để debug hoặc xử lý ở client)
      return NextResponse.json({
        success: true, // Vẫn coi là thành công bước 1
        ticket: signInToken.token,
        userId: user.id,
        url: signInToken.url,
        exchangeError: 'Failed to exchange ticket for session token',
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

    // 5. Trả về thông tin người dùng và token
    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      token: sessionToken, // Token quan trọng nhất để gọi API
      ticket: signInToken.token, // Vẫn trả về ticket nếu cần (dù đã bị consume)
    });

  } catch (error) {
    console.error('[MOBILE_AUTH_ERROR]', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/auth/mobile:
 *   get:
 *     summary: Get current user information
 *     description: |
 *       Returns current authenticated user information for mobile app.
 *       Requires valid Clerk JWT token.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 userId:
 *                   type: string
 *                   description: Clerk user ID
 *                 email:
 *                   type: string
 *                   description: User's email address
 *                 firstName:
 *                   type: string
 *                   description: User's first name
 *                 lastName:
 *                   type: string
 *                   description: User's last name
 *       '401':
 *         description: Unauthorized - Invalid or missing JWT token
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
    });

  } catch (error) {
    console.error('[MOBILE_AUTH_GET_ERROR]', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}