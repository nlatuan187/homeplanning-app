import { NextResponse } from 'next/server';
import { clerkClient, auth, currentUser } from '@clerk/nextjs/server';

/**
 * @swagger
 * /auth/mobile:
 *   post:
 *     summary: Authenticate mobile user with Clerk
 *     description: |
 *       Authenticates mobile users using Clerk's headless authentication.
 *       Returns user information and JWT token for mobile app usage.
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
 *                 sessionToken:
 *                   type: string
 *                   description: The JWT for the session.
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

    // 3. Tạo session và JWT token cho người dùng
    const session = await (await clerkClient()).sessions.createSession({ userId: user.id });
    const sessionToken = await (await clerkClient()).sessions.getToken(session.id, 'session_token');

    // 4. Trả về thông tin người dùng và token
    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      sessionToken: sessionToken,
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
 * /auth/mobile:
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

