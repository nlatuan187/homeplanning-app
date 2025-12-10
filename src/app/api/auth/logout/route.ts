import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user and invalidate session
 *     description: |
 *       Logs out the current user and invalidates their session.
 *       For mobile apps, this should clear stored tokens.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       '401':
 *         description: Unauthorized - No valid session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No active session"
 */
export async function POST(req: NextRequest) {
  try {
    const { verifyMobileToken } = await import('@/lib/mobileAuth');
    const userId = await verifyMobileToken(req);

    if (!userId) {
      return NextResponse.json({
        error: 'No active session'
      }, { status: 401 });
    }

    // 4. Blacklist the token (Prevent reuse)
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.decode(token) as any;

        if (decoded && decoded.jti) {
          const { db } = await import('@/lib/db');
          // Use expiration from token, or default to 30 days if missing
          const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          await db.tokenBlacklist.create({
            data: {
              jti: decoded.jti,
              userId: userId,
              expiresAt: expiresAt
            }
          });
          console.log('[LOGOUT] Token blacklisted:', decoded.jti);
        }
      }
    } catch (error) {
      console.error('[LOGOUT_BLACKLIST_ERROR]', error);
    }

    // Revoke the Clerk session (optional, mainly for web sessions)

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('[LOGOUT_ERROR]', error);
    return NextResponse.json({
      error: 'Logout failed'
    }, { status: 500 });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  });
}

