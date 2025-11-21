import { NextResponse } from 'next/server';
import { clerkClient, auth, currentUser } from '@clerk/nextjs/server';

/**
 * @swagger
 * /api/auth/mobile:
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
 *                 signInToken:
 *                   type: string
 *                   description: Sign-in token for Clerk SDK authentication
 *                 tokenUrl:
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

    // 3. Tạo Sign-In Token cho mobile app
    // Sign-in token cho phép mobile app sign in thông qua Clerk SDK
    const signInToken = await (await clerkClient()).signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 3600, // Token hết hạn sau 1 giờ
    });

    // 4. Trả về thông tin người dùng và sign-in token
    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      sessionToken: signInToken.token, // Mobile app sẽ dùng token này để sign in
      tokenUrl: signInToken.url, // URL để sign in (optional)
    });

  } catch (error: any) {
    console.error('[MOBILE_AUTH_ERROR]', error);
    if (error.errors) {
      console.error('[MOBILE_AUTH_CLERK_ERRORS]', JSON.stringify(error.errors, null, 2));
    }
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
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
 *       Supports both session-based auth (web/Swagger) and JWT token auth (mobile/Postman).
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
    // Try to get user from session first (for web/Swagger docs)
    const { userId: sessionUserId } = await auth();
    const sessionUser = await currentUser();

    // If session exists, use it
    if (sessionUserId && sessionUser) {
      return NextResponse.json({
        success: true,
        userId: sessionUser.id,
        email: sessionUser.emailAddresses[0]?.emailAddress,
        firstName: sessionUser.firstName,
        lastName: sessionUser.lastName,
      });
    }

    // Otherwise, try to verify JWT token from Authorization header (for mobile/Postman)
    const client = await clerkClient();

    // Use authenticateRequest() to verify the JWT token
    try {
      const { isSignedIn, toAuth } = await client.authenticateRequest(req, {
        jwtKey: process.env.CLERK_JWT_KEY,
      });

      if (!isSignedIn) {
        return NextResponse.json({
          error: 'Unauthenticated',
          message: 'Invalid or expired token. Please login again.'
        }, { status: 401 });
      }

      // Get user ID from the authenticated request
      const authObject = toAuth();
      const userId = authObject.userId;

      if (!userId) {
        return NextResponse.json({
          error: 'Unauthenticated',
          message: 'Invalid token payload.'
        }, { status: 401 });
      }

      // Fetch user details from Clerk
      const user = await client.users.getUser(userId);

      return NextResponse.json({
        success: true,
        userId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
      });

    } catch (tokenError: any) {
      console.error('[TOKEN_VERIFICATION_ERROR]', tokenError);
      return NextResponse.json({
        error: 'Unauthenticated',
        message: tokenError.message || 'Token verification failed. Please login again.'
      }, { status: 401 });
    }

  } catch (error) {
    console.error('[MOBILE_AUTH_GET_ERROR]', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
