import { NextResponse } from 'next/server';
import { clerkClient, auth, currentUser } from '@clerk/nextjs/server';
import jwt from 'jsonwebtoken';

// Use CLERK_SECRET_KEY as the secret for custom tokens
const JWT_SECRET = process.env.CLERK_SECRET_KEY || 'mobile_auth_secret_fallback_12345';

/**
 * @swagger
 * /api/auth/mobile:
 *   post:
 *     summary: Authenticate mobile user with Clerk (Custom Long-Lived Token)
 *     description: |
 *       Authenticates mobile users using Clerk's headless authentication.
 *       Returns a custom long-lived JWT (30 days) for mobile app usage.
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
 *                   description: Custom Long-Lived JWT (30 days)
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

    // 3. Tạo Custom JWT (Long-lived)
    const jti = crypto.randomUUID(); // Unique Token ID
    const payload = {
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      jti: jti, // Include JTI in payload
    };

    // Explicitly use HS256
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '30d',
      algorithm: 'HS256'
    });

    console.log(`[MOBILE_AUTH] Generated custom token for user ${user.id}`);

    // 4. Trả về thông tin người dùng và token
    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      token: token,
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
 *       Supports both Custom JWT (HS256) and Clerk Session Token (RS256).
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
    console.log('[MOBILE_AUTH_GET] Headers:', Object.fromEntries(req.headers));

    // 1. Lấy token từ Header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      console.log('[MOBILE_AUTH_GET] No token provided');
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    // 2. HYBRID VERIFICATION STRATEGY

    // Strategy A: Try to verify as Custom JWT (HS256)
    try {
      // Explicitly allow HS256
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;

      console.log('[MOBILE_AUTH_GET] Strategy A (Custom JWT) Success for user:', decoded.userId);

      return NextResponse.json({
        success: true,
        userId: decoded.userId,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        authType: 'custom_jwt'
      });

    } catch (customJwtError) {
      console.log('[MOBILE_AUTH_GET] Strategy A (Custom JWT) Failed, trying Strategy B...');
      // Ignore error, proceed to Strategy B
    }

    // Strategy B: Try to verify as Clerk Session Token (RS256) via auth() helper
    // Note: auth() automatically checks the request headers/cookies
    const authResult = await auth();
    const { userId } = authResult;

    if (userId) {
      console.log('[MOBILE_AUTH_GET] Strategy B (Clerk Auth) Success for user:', userId);

      const user = await currentUser();
      if (user) {
        return NextResponse.json({
          success: true,
          userId: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          authType: 'clerk_session'
        });
      }
    }

    // If both strategies fail
    console.log('[MOBILE_AUTH_GET] All authentication strategies failed');
    return NextResponse.json({
      error: 'Unauthorized',
      debug: {
        message: 'Token verification failed for both Custom JWT and Clerk Session',
        tokenLength: token.length
      }
    }, { status: 401 });

  } catch (error) {
    console.error('[MOBILE_AUTH_GET_ERROR]', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}