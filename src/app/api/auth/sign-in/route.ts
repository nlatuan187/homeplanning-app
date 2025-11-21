import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/auth/sign-in:
 *   post:
 *     summary: Sign in a user manually
 *     description: Signs in a user in the Clerk system using email and password. This endpoint is public.
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
 *                 token:
 *                   type: string
 *                   description: Sign-in token for mobile app authentication
 *                 userId:
 *                   type: string
 *                   description: User ID
 *                 url:
 *                   type: string
 *                   description: Optional URL for web redirect
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

    // 3. Tạo Sign-In Token cho mobile app (hoạt động cả dev và production)
    // Mobile app sẽ dùng token này để authenticate thông qua Clerk SDK
    const signInToken = await (await clerkClient()).signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 2592000, // Token hết hạn sau 30 ngày
    });

    return NextResponse.json({
      token: signInToken.token,
      userId: user.id,
      url: signInToken.url // URL để sign in (optional, dùng cho web redirect)
    });

  } catch (error) {
    console.error('Error signing in user:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}