import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /auth/sign-in:
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
 *       '401':
 *         description: Invalid credentials.
 *       '500':
 *         description: Internal Server Error.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

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
    
    if (!verification.verified) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    return NextResponse.json({ success: true, userId: user.id }, { status: 200 });

    // // 3. Tạo session token (JWT) cho người dùng
    // const sessionToken = await (await clerkClient()).users.createSessionToken(user.id);
    // return NextResponse.json({ sessionToken });

  } catch (error) {
    console.error('Error signing in user:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}